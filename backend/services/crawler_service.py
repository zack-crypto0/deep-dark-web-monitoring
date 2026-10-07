import hashlib

from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse


# =========================================================
# CONTROLLED FIXTURE CONFIGURATION
# =========================================================

BACKEND_ROOT = (
    Path(__file__)
    .resolve()
    .parents[1]
)


FIXTURE_ROOT = (
    BACKEND_ROOT
    / "fixtures"
    / "controlled_sources"
)


MAX_PAGES = 10
MAX_DEPTH = 2
MAX_RESPONSE_BYTES = 1_000_000


# =========================================================
# HTML PARSER
# =========================================================

class PageParser(HTMLParser):

    def __init__(self):

        super().__init__()

        self.text_parts = []
        self.links = []

        self.ignore_text = False


    def handle_starttag(
        self,
        tag,
        attrs
    ):

        tag = tag.lower()


        if tag in {
            "script",
            "style"
        }:

            self.ignore_text = True


        if tag == "a":

            for key, value in attrs:

                if (
                    key.lower() == "href"
                    and
                    value
                ):

                    self.links.append(
                        value
                    )


    def handle_endtag(
        self,
        tag
    ):

        if tag.lower() in {
            "script",
            "style"
        }:

            self.ignore_text = False


    def handle_data(
        self,
        data
    ):

        if self.ignore_text:

            return


        cleaned = (
            data.strip()
        )


        if cleaned:

            self.text_parts.append(
                cleaned
            )


    def get_text(self):

        return " ".join(
            self.text_parts
        )


# =========================================================
# CONTENT HASH
# =========================================================

def calculate_content_hash(
    content: str
):

    return hashlib.sha256(
        content.encode(
            "utf-8"
        )
    ).hexdigest()


# =========================================================
# SAFE FIXTURE PATH
# =========================================================

def get_safe_fixture_path(
    relative_path: str
):

    if not relative_path:

        raise ValueError(
            "Fixture path is empty."
        )


    parsed = urlparse(
        relative_path
    )


    # Block HTTP, HTTPS, file:// etc.
    if (
        parsed.scheme
        or
        parsed.netloc
    ):

        raise ValueError(
            "External URLs are not allowed "
            "in controlled fixtures."
        )


    clean_path = (
        parsed.path
        .lstrip("/")
    )


    candidate = (
        FIXTURE_ROOT
        / clean_path
    ).resolve()


    root = (
        FIXTURE_ROOT
        .resolve()
    )


    # Prevent ../ path traversal
    try:

        candidate.relative_to(
            root
        )

    except ValueError:

        raise ValueError(
            "Fixture path escaped "
            "the controlled directory."
        )


    if (
        candidate.suffix.lower()
        != ".html"
    ):

        raise ValueError(
            "Controlled crawler only "
            "processes HTML fixture files."
        )


    return candidate


# =========================================================
# READ FIXTURE PAGE
# =========================================================

def read_fixture_page(
    relative_path: str
):

    file_path = (
        get_safe_fixture_path(
            relative_path
        )
    )


    if not file_path.exists():

        raise FileNotFoundError(
            f"Controlled fixture not found: "
            f"{relative_path}"
        )


    if not file_path.is_file():

        raise ValueError(
            "Controlled fixture is "
            "not a valid file."
        )


    file_size = (
        file_path.stat()
        .st_size
    )


    if (
        file_size
        > MAX_RESPONSE_BYTES
    ):

        raise ValueError(
            "Controlled fixture exceeded "
            "the maximum allowed size."
        )


    html = (
        file_path.read_text(
            encoding="utf-8"
        )
    )


    parser = PageParser()

    parser.feed(
        html
    )


    return {
        "text":
            parser.get_text(),

        "links":
            parser.links
    }


# =========================================================
# SAFE LINK RESOLUTION
# =========================================================

def resolve_fixture_link(
    current_file: str,
    href: str
):

    if not href:

        return None


    parsed = urlparse(
        href
    )


    # Never allow external links
    if (
        parsed.scheme
        or
        parsed.netloc
    ):

        return None


    path = (
        parsed.path
        .strip()
    )


    if not path:

        return None


    current_path = Path(
        current_file
    )


    combined = (
        current_path.parent
        / path
    )


    normalized = (
        combined.as_posix()
    )


    try:

        get_safe_fixture_path(
            normalized
        )

    except Exception:

        return None


    return normalized


# =========================================================
# CONTROLLED CRAWLER
# =========================================================

def crawl_controlled_source(
    start_file: str = "index.html"
):

    if not FIXTURE_ROOT.exists():

        raise FileNotFoundError(
            "Controlled fixture directory "
            "was not found."
        )


    # Validate start page
    get_safe_fixture_path(
        start_file
    )


    queue = [
        (
            start_file,
            0
        )
    ]


    visited = set()

    collected_records = []


    while (
        queue
        and
        len(visited) < MAX_PAGES
    ):

        current_file, depth = (
            queue.pop(0)
        )


        if current_file in visited:

            continue


        visited.add(
            current_file
        )


        try:

            page = (
                read_fixture_page(
                    current_file
                )
            )

        except Exception as error:

            print(
                "Controlled crawler warning:",
                current_file,
                error
            )

            continue


        content = (
            page["text"]
        )


        collected_at = (
            datetime.now(
                timezone.utc
            )
            .isoformat()
        )


        content_hash = (
            calculate_content_hash(
                content
            )
        )


        collected_records.append(
            {
                "source_name":
                    "Controlled Monitoring Fixture",

                "source_type":
                    "controlled_fixture",

                "source_reference":
                    (
                        "fixture://controlled/"
                        f"{current_file}"
                    ),

                "content":
                    content,

                "collected_at":
                    collected_at,

                "content_hash":
                    content_hash
            }
        )


        if depth >= MAX_DEPTH:

            continue


        for href in page["links"]:

            next_file = (
                resolve_fixture_link(
                    current_file,
                    href
                )
            )


            if not next_file:

                continue


            if next_file in visited:

                continue


            queue.append(
                (
                    next_file,
                    depth + 1
                )
            )


    return collected_records


# =========================================================
# LOCAL TEST
# =========================================================

if __name__ == "__main__":

    records = (
        crawl_controlled_source(
            "index.html"
        )
    )


    print(
        "\n=============================="
    )

    print(
        "CONTROLLED FIXTURE RESULTS"
    )

    print(
        "=============================="
    )

    print(
        "Pages collected:",
        len(records)
    )


    for record in records:

        print(
            "\nSource:",
            record[
                "source_reference"
            ]
        )

        print(
            "Hash:",
            record[
                "content_hash"
            ]
        )

        print(
            "Collected:",
            record[
                "collected_at"
            ]
        )

        print(
            "Content:",
            record[
                "content"
            ][:200]
        )