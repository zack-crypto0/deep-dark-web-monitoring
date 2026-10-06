import hashlib

from datetime import datetime, timezone
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen


# =========================================================
# CONTROLLED CRAWLER CONFIGURATION
# =========================================================

ALLOWED_HOSTS = {
    "127.0.0.1",
    "localhost"
}

ALLOWED_PORTS = {
    8081
}

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
                    and value
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
# URL SECURITY VALIDATION
# =========================================================

def validate_controlled_url(
    url: str
):

    parsed = urlparse(
        url
    )


    if parsed.scheme != "http":

        raise ValueError(
            "Controlled crawler only allows HTTP."
        )


    if parsed.hostname not in ALLOWED_HOSTS:

        raise ValueError(
            "Crawler blocked a non-local host."
        )


    port = (
        parsed.port
        or 80
    )


    if port not in ALLOWED_PORTS:

        raise ValueError(
            "Crawler blocked an unauthorized port."
        )


    return parsed


# =========================================================
# CONTENT HASH
# =========================================================

def calculate_content_hash(
    content: str
):

    return (
        hashlib.sha256(
            content.encode(
                "utf-8"
            )
        )
        .hexdigest()
    )


# =========================================================
# FETCH PAGE
# =========================================================

def fetch_page(
    url: str
):

    validate_controlled_url(
        url
    )


    request = Request(
        url,
        headers={
            "User-Agent":
                "DDWMS-ControlledCrawler/1.0"
        }
    )


    with urlopen(
        request,
        timeout=5
    ) as response:

        content_type = (
            response.headers
            .get(
                "Content-Type",
                ""
            )
            .lower()
        )


        if "text/html" not in content_type:

            raise ValueError(
                "Crawler only processes HTML pages."
            )


        raw_content = (
            response.read(
                MAX_RESPONSE_BYTES + 1
            )
        )


        if (
            len(raw_content)
            > MAX_RESPONSE_BYTES
        ):

            raise ValueError(
                "Page exceeded crawler size limit."
            )


        html = (
            raw_content.decode(
                "utf-8",
                errors="replace"
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
# SAME-ORIGIN CHECK
# =========================================================

def is_allowed_link(
    base_url: str,
    candidate_url: str
):

    try:

        base = urlparse(
            base_url
        )

        candidate = urlparse(
            candidate_url
        )


        validate_controlled_url(
            candidate_url
        )


        return (
            base.hostname
            == candidate.hostname
            and
            (base.port or 80)
            ==
            (candidate.port or 80)
        )


    except Exception:

        return False


# =========================================================
# CONTROLLED CRAWLER
# =========================================================

def crawl_controlled_source(
    start_url: str
):

    validate_controlled_url(
        start_url
    )


    queue = [
        (
            start_url,
            0
        )
    ]


    visited = set()

    collected_records = []


    while (
        queue
        and
        len(visited)
        < MAX_PAGES
    ):

        current_url, depth = (
            queue.pop(0)
        )


        if current_url in visited:

            continue


        visited.add(
            current_url
        )


        try:

            page = fetch_page(
                current_url
            )


        except Exception as error:

            print(
                "Crawler warning:",
                current_url,
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
                    "Controlled Monitoring Source",

                "source_type":
                    "controlled_crawler",

                "source_reference":
                    current_url,

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

            absolute_url = urljoin(
                current_url,
                href
            )


            if not is_allowed_link(
                start_url,
                absolute_url
            ):

                continue


            if absolute_url in visited:

                continue


            queue.append(
                (
                    absolute_url,
                    depth + 1
                )
            )


    return collected_records


# =========================================================
# MANUAL TEST
# =========================================================

if __name__ == "__main__":

    records = (
        crawl_controlled_source(
            "http://127.0.0.1:8081/index.html"
        )
    )


    print(
        "\n=============================="
    )

    print(
        "CONTROLLED CRAWLER RESULTS"
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