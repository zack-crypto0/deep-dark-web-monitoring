import { useEffect, useState } from "react"

import { apiFetch } from "../api"


function AuditLogs() {

  const [logs, setLogs] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState("")


  // ========================================
  // FETCH LOGS
  // ========================================

  const fetchLogs = async () => {

    try {

      setError("")


      const response =
        await apiFetch(
          "/audit/"
        )


      const data =
        await response.json()


      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Failed to load audit logs."
        )

      }


      setLogs(data)


    } catch (error) {

      console.error(
        "Audit log error:",
        error
      )


      setError(
        error.message ||
        "Unable to load audit logs."
      )


    } finally {

      setLoading(false)

    }

  }


  // ========================================
  // INITIAL LOAD
  // ========================================

  useEffect(() => {

    fetchLogs()

  }, [])


  // ========================================
  // ACTION LABEL
  // ========================================

  const actionLabel = (
    action
  ) => {

    const labels = {

      CREATE_WATCHLIST:
        "Watchlist Created",

      UPDATE_WATCHLIST:
        "Watchlist Updated",

      UPDATE_WATCHLIST_STATUS:
        "Watchlist Status Updated",

      DELETE_WATCHLIST:
        "Watchlist Deleted",

      LOGIN:
        "User Login",

      LOGOUT:
        "User Logout",

      RUN_SCAN:
        "Threat Scan",

      UPDATE_FINDING_STATUS:
        "Finding Status Updated",

      UPDATE_ALERT_STATUS:
        "Alert Status Updated",

      GENERATE_REPORT:
        "Report Generated",

      CREATE_USER:
        "User Created",

      UPDATE_USER_ROLE:
        "User Role Updated",

      UPDATE_USER_STATUS:
        "User Status Updated"
    }


    return (
      labels[action] ||
      action
    )

  }


  // ========================================
  // LOADING
  // ========================================

  if (loading) {

    return (

      <div className="text-slate-400">

        Loading audit logs...

      </div>

    )

  }


  // ========================================
  // PAGE
  // ========================================

  return (

    <div>


      {/* HEADER */}

      <div className="mb-8">

        <h1 className="text-3xl font-bold">

          Audit Logs

        </h1>


        <p className="text-slate-400 mt-1">

          Review important actions
          performed by authorized
          system users.

        </p>

      </div>


      {/* ERROR */}

      {error && (

        <div className="mb-6 bg-red-950/40 border border-red-800 text-red-300 rounded-xl p-4">

          {error}

        </div>

      )}


      {/* SUMMARY */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">


        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

          <p className="text-sm text-slate-400">

            Total Logs

          </p>

          <p className="text-3xl font-bold mt-2">

            {logs.length}

          </p>

        </div>


        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

          <p className="text-sm text-slate-400">

            Login Events

          </p>

          <p className="text-3xl font-bold mt-2">

            {
              logs.filter(
                (log) =>
                  log.action ===
                  "LOGIN"
              ).length
            }

          </p>

        </div>


        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

          <p className="text-sm text-slate-400">

            Scan Events

          </p>

          <p className="text-3xl font-bold mt-2">

            {
              logs.filter(
                (log) =>
                  log.action ===
                  "RUN_SCAN"
              ).length
            }

          </p>

        </div>

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
                User
              </th>

              <th className="p-4 text-left">
                Action
              </th>

              <th className="p-4 text-left">
                Record
              </th>

              <th className="p-4 text-left">
                Time
              </th>

            </tr>

          </thead>


          <tbody>

            {logs.length === 0 ? (

              <tr>

                <td
                  colSpan="5"
                  className="p-10 text-center text-slate-400"
                >

                  No audit logs
                  recorded yet.

                </td>

              </tr>

            ) : (

              logs.map(
                (log) => (

                  <tr
                    key={log.audit_id}

                    className="border-t border-slate-800 hover:bg-slate-800/40"
                  >


                    <td className="p-4 text-slate-400">

                      #{log.audit_id}

                    </td>


                    <td className="p-4">

                      <p className="font-semibold">

                        {log.username}

                      </p>


                      {log.user_id && (

                        <p className="text-xs text-slate-500 mt-1">

                          User #{log.user_id}

                        </p>

                      )}

                    </td>


                    <td className="p-4">

                      <span className="inline-block bg-blue-900/40 text-blue-300 border border-blue-800 px-3 py-1 rounded-full text-sm">

                        {
                          actionLabel(
                            log.action
                          )
                        }

                      </span>

                    </td>


                    <td className="p-4">

                      {
                        log.record_type ||
                        "-"
                      }


                      {
                        log.record_id
                          ? ` #${log.record_id}`
                          : ""
                      }

                    </td>


                    <td className="p-4 text-slate-400">

                      {
                        log.timestamp
                          ? new Date(
                              log.timestamp
                            ).toLocaleString()
                          : "-"
                      }

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


export default AuditLogs