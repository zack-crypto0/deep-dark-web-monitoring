import {
  useEffect,
  useState
} from "react"

import {
  useNavigate
} from "react-router-dom"

import {
  apiFetch
} from "../api"


function Findings() {

  const navigate =
    useNavigate()


  const [findings, setFindings] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [message, setMessage] =
    useState("")

  const [error, setError] =
    useState("")


  const [search, setSearch] =
    useState("")

  const [severity, setSeverity] =
    useState("")

  const [status, setStatus] =
    useState("")

  const [sort, setSort] =
    useState("newest")


  const user = JSON.parse(

    localStorage.getItem(
      "user"
    )

    || "null"

  )


  const canManage =

    user?.role === "admin"

    ||

    user?.role === "analyst"


  // ========================================
  // FETCH
  // ========================================

  const fetchFindings = async () => {

    try {

      setLoading(true)

      setError("")


      const params =
        new URLSearchParams()


      if (search.trim()) {

        params.append(
          "search",
          search.trim()
        )

      }


      if (severity) {

        params.append(
          "severity",
          severity
        )

      }


      if (status) {

        params.append(
          "status",
          status
        )

      }


      if (sort) {

        params.append(
          "sort",
          sort
        )

      }


      const query =
        params.toString()


      const response =
        await apiFetch(

          query

            ? `/findings/?${query}`

            : "/findings/"

        )


      const data =
        await response.json()


      if (!response.ok) {

        throw new Error(

          data.detail

          ||

          "Failed to load findings."

        )

      }


      setFindings(
        data
      )


    } catch (error) {

      console.error(
        "Findings fetch error:",
        error
      )


      setError(

        error.message

        ||

        "Unable to load findings."

      )


    } finally {

      setLoading(false)

    }

  }


  // ========================================
  // INITIAL
  // ========================================

  useEffect(() => {

    fetchFindings()

  }, [])


  // ========================================
  // AUTO FILTER
  // ========================================

  useEffect(() => {

    fetchFindings()

  }, [
    severity,
    status,
    sort
  ])


  // ========================================
  // SEARCH
  // ========================================

  const handleSearch = (
    event
  ) => {

    event.preventDefault()

    fetchFindings()

  }


  // ========================================
  // RESET
  // ========================================

  const resetFilters = () => {

    setSearch("")

    setSeverity("")

    setStatus("")

    setSort("newest")

  }


  // ========================================
  // UPDATE STATUS
  // ========================================

  const updateStatus = async (
    findingId,
    newStatus
  ) => {

    try {

      setMessage("")

      setError("")


      const response =
        await apiFetch(
          `/findings/${findingId}/status`,
          {

            method:
              "PUT",

            headers: {

              "Content-Type":
                "application/json"

            },

            body:
              JSON.stringify({

                status:
                  newStatus

              })

          }
        )


      const data =
        await response.json()


      if (!response.ok) {

        throw new Error(

          data.detail

          ||

          "Failed to update finding."

        )

      }


      setMessage(

        `Finding #${findingId} updated to ${newStatus}.`

      )


      await fetchFindings()


    } catch (error) {

      console.error(
        "Finding status error:",
        error
      )


      setError(

        error.message

        ||

        "Unable to update finding."

      )

    }

  }


  // ========================================
  // SEVERITY STYLE
  // ========================================

  const severityClass = (
    severity
  ) => {

    if (
      severity === "Critical"
    ) {

      return "bg-red-900/40 text-red-300 border-red-800"

    }


    if (
      severity === "High"
    ) {

      return "bg-orange-900/40 text-orange-300 border-orange-800"

    }


    if (
      severity === "Medium"
    ) {

      return "bg-yellow-900/40 text-yellow-300 border-yellow-800"

    }


    return "bg-green-900/40 text-green-300 border-green-800"

  }


  return (

    <div>


      {/* HEADER */}

      <div className="mb-8">

        <h1 className="text-3xl font-bold">

          Threat Findings

        </h1>


        <p className="text-slate-400 mt-1">

          Search, filter and investigate
          detected threat findings.

        </p>

      </div>


      {message && (

        <div className="mb-6 bg-green-950/40 border border-green-800 text-green-300 rounded-xl p-4">

          {message}

        </div>

      )}


      {error && (

        <div className="mb-6 bg-red-950/40 border border-red-800 text-red-300 rounded-xl p-4">

          {error}

        </div>

      )}


      {/* SEARCH */}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">


        <form
          onSubmit={
            handleSearch
          }
        >

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">


            <div className="xl:col-span-2">

              <label className="block text-sm text-slate-400 mb-2">

                Search

              </label>


              <input
                value={
                  search
                }

                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target.value
                  )
                }

                placeholder="Search asset, category or content..."

                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 outline-none"
              />

            </div>


            <div>

              <label className="block text-sm text-slate-400 mb-2">

                Severity

              </label>


              <select
                value={
                  severity
                }

                onChange={(
                  event
                ) =>
                  setSeverity(
                    event.target.value
                  )
                }

                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3"
              >

                <option value="">
                  All Severity
                </option>

                <option value="Critical">
                  Critical
                </option>

                <option value="High">
                  High
                </option>

                <option value="Medium">
                  Medium
                </option>

                <option value="Low">
                  Low
                </option>

              </select>

            </div>


            <div>

              <label className="block text-sm text-slate-400 mb-2">

                Status

              </label>


              <select
                value={
                  status
                }

                onChange={(
                  event
                ) =>
                  setStatus(
                    event.target.value
                  )
                }

                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3"
              >

                <option value="">
                  All Status
                </option>

                <option value="New">
                  New
                </option>

                <option value="Investigating">
                  Investigating
                </option>

                <option value="Resolved">
                  Resolved
                </option>

              </select>

            </div>


            <div>

              <label className="block text-sm text-slate-400 mb-2">

                Sort

              </label>


              <select
                value={
                  sort
                }

                onChange={(
                  event
                ) =>
                  setSort(
                    event.target.value
                  )
                }

                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3"
              >

                <option value="newest">
                  Newest
                </option>

                <option value="oldest">
                  Oldest
                </option>

                <option value="highest_risk">
                  Highest Risk
                </option>

                <option value="lowest_risk">
                  Lowest Risk
                </option>

              </select>

            </div>

          </div>


          <div className="flex gap-3 mt-5">

            <button
              type="submit"

              className="bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-lg font-semibold"
            >

              Search

            </button>


            <button
              type="button"

              onClick={
                resetFilters
              }

              className="bg-slate-800 border border-slate-700 hover:bg-slate-700 px-5 py-2.5 rounded-lg font-semibold"
            >

              Reset Filters

            </button>

          </div>

        </form>

      </div>


      <div className="mb-4">

        <p className="text-sm text-slate-400">

          Showing{" "}

          <span className="text-white font-semibold">

            {
              findings.length
            }

          </span>

          {" "}finding(s)

        </p>

      </div>


      {/* TABLE */}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">


        <table className="w-full">


          <thead className="bg-slate-800">

            <tr>

              <th className="p-4 text-left">
                ID
              </th>

              <th className="p-4 text-left">
                Asset
              </th>

              <th className="p-4 text-left">
                Category
              </th>

              <th className="p-4 text-left">
                Risk
              </th>

              <th className="p-4 text-left">
                Severity
              </th>

              <th className="p-4 text-left">
                Status
              </th>

              <th className="p-4 text-left">
                Detected
              </th>

              <th className="p-4 text-left">
                Investigation
              </th>

            </tr>

          </thead>


          <tbody>


            {loading ? (

              <tr>

                <td
                  colSpan="8"
                  className="p-10 text-center text-slate-400"
                >

                  Loading findings...

                </td>

              </tr>

            ) : findings.length === 0 ? (

              <tr>

                <td
                  colSpan="8"
                  className="p-10 text-center text-slate-400"
                >

                  No findings match
                  the selected filters.

                </td>

              </tr>

            ) : (

              findings.map(
                (finding) => (

                  <tr
                    key={
                      finding.finding_id
                    }

                    className="border-t border-slate-800 hover:bg-slate-800/40"
                  >


                    <td className="p-4 text-slate-400">

                      #{finding.finding_id}

                    </td>


                    <td className="p-4 font-semibold">

                      {
                        finding.matched_value
                        || "-"
                      }

                    </td>


                    <td className="p-4">

                      {
                        finding.threat_category
                        || "-"
                      }

                    </td>


                    <td className="p-4">

                      {
                        finding.risk_score
                        ?? 0
                      }
                      /100

                    </td>


                    <td className="p-4">

                      <span
                        className={`
                          border
                          px-3
                          py-1
                          rounded-full
                          text-sm
                          ${severityClass(
                            finding.severity
                          )}
                        `}
                      >

                        {
                          finding.severity
                        }

                      </span>

                    </td>


                    <td className="p-4">

                      {canManage ? (

                        <select
                          value={
                            finding.status
                          }

                          onChange={(
                            event
                          ) =>
                            updateStatus(

                              finding.finding_id,

                              event.target.value

                            )
                          }

                          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                        >

                          <option value="New">
                            New
                          </option>

                          <option value="Investigating">
                            Investigating
                          </option>

                          <option value="Resolved">
                            Resolved
                          </option>

                        </select>

                      ) : (

                        <span>

                          {
                            finding.status
                          }

                        </span>

                      )}

                    </td>


                    <td className="p-4 text-sm text-slate-400">

                      {
                        finding.detected_at
                          ? new Date(
                              finding.detected_at
                            ).toLocaleString()
                          : "-"
                      }

                    </td>


                    <td className="p-4">

                      <button
                        onClick={() =>
                          navigate(
                            `/findings/${finding.finding_id}`
                          )
                        }

                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-semibold"
                      >

                        View Investigation

                      </button>

                    </td>


                  </tr>

                )
              )

            )}


          </tbody>

        </table>

      </div>

    </div>

  )

}


export default Findings