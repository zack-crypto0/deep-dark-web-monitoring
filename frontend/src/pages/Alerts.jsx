import { useEffect, useState } from "react"
import { apiFetch } from "../api"


function Alerts() {

  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")


  // =========================
  // CURRENT USER + RBAC
  // =========================

  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  )


  const canManage =
    user?.role === "admin" ||
    user?.role === "analyst"


  // =========================
  // FETCH ALERTS
  // =========================

  const fetchAlerts = async () => {

    try {

      setError("")

      const response = await apiFetch(
        "/alerts/"
      )


      if (!response.ok) {

        const data = await response.json()

        throw new Error(
          data.detail ||
          "Failed to load alerts."
        )

      }


      const data = await response.json()

      setAlerts(data)


    } catch (error) {

      console.error(
        "Alerts fetch error:",
        error
      )

      setError(
        error.message ||
        "Unable to load security alerts."
      )


    } finally {

      setLoading(false)

    }

  }


  // =========================
  // INITIAL LOAD
  // =========================

  useEffect(() => {

    fetchAlerts()

  }, [])


  // =========================
  // MARK ALERT AS READ
  // =========================

  const markAsRead = async (
    alertId
  ) => {

    try {

      setMessage("")
      setError("")


      const response = await apiFetch(
        `/alerts/${alertId}/status`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            status: "Read"
          })
        }
      )


      const data =
        await response.json()


      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Failed to update alert."
        )

      }


      setMessage(
        `Alert #${alertId} marked as read.`
      )


      await fetchAlerts()


    } catch (error) {

      console.error(
        "Alert update error:",
        error
      )

      setError(
        error.message ||
        "Failed to update alert."
      )

    }

  }


  // =========================
  // OPTIONAL: MARK AS UNREAD
  // =========================

  const markAsUnread = async (
    alertId
  ) => {

    try {

      setMessage("")
      setError("")


      const response = await apiFetch(
        `/alerts/${alertId}/status`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            status: "Unread"
          })
        }
      )


      const data =
        await response.json()


      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Failed to update alert."
        )

      }


      setMessage(
        `Alert #${alertId} marked as unread.`
      )


      await fetchAlerts()


    } catch (error) {

      console.error(
        "Alert update error:",
        error
      )

      setError(
        error.message ||
        "Failed to update alert."
      )

    }

  }


  // =========================
  // SEVERITY STYLE
  // =========================

  const severityClass = (
    severity
  ) => {

    if (severity === "Critical") {

      return (
        "bg-red-900/40 " +
        "text-red-300 " +
        "border-red-800"
      )

    }


    if (severity === "High") {

      return (
        "bg-orange-900/40 " +
        "text-orange-300 " +
        "border-orange-800"
      )

    }


    if (severity === "Medium") {

      return (
        "bg-yellow-900/40 " +
        "text-yellow-300 " +
        "border-yellow-800"
      )

    }


    return (
      "bg-green-900/40 " +
      "text-green-300 " +
      "border-green-800"
    )

  }


  // =========================
  // ALERT STATUS STYLE
  // =========================

  const statusClass = (
    status
  ) => {

    if (status === "Unread") {

      return (
        "bg-blue-900/40 " +
        "text-blue-300 " +
        "border-blue-800"
      )

    }


    return (
      "bg-slate-800 " +
      "text-slate-400 " +
      "border-slate-700"
    )

  }


  // =========================
  // LOADING
  // =========================

  if (loading) {

    return (

      <div className="text-slate-400">

        Loading security alerts...

      </div>

    )

  }


  // =========================
  // COUNTERS
  // =========================

  const unreadCount = alerts.filter(
    (alert) =>
      alert.status === "Unread"
  ).length


  const criticalCount =
    alerts.filter(
      (alert) =>
        alert.severity === "Critical"
    ).length


  const highCount =
    alerts.filter(
      (alert) =>
        alert.severity === "High"
    ).length


  // =========================
  // PAGE
  // =========================

  return (

    <div>


      {/* PAGE HEADER */}

      <div className="mb-8">

        <h1 className="text-3xl font-bold">

          Security Alerts

        </h1>


        <p className="text-slate-400 mt-1">

          Review alerts generated from
          monitored asset matches and
          threat detections.

        </p>


        {user && (

          <p className="text-xs text-slate-500 mt-2">

            Access level:{" "}

            <span className="capitalize text-blue-400">

              {user.role}

            </span>

          </p>

        )}

      </div>


      {/* SUMMARY CARDS */}

      <div
        className="
          grid
          grid-cols-1
          md:grid-cols-3
          gap-5
          mb-8
        "
      >


        <div
          className="
            bg-slate-900
            border
            border-slate-800
            rounded-xl
            p-5
          "
        >

          <p className="text-sm text-slate-400">

            Unread Alerts

          </p>

          <p className="text-3xl font-bold mt-2">

            {unreadCount}

          </p>

        </div>


        <div
          className="
            bg-slate-900
            border
            border-slate-800
            rounded-xl
            p-5
          "
        >

          <p className="text-sm text-slate-400">

            Critical Alerts

          </p>

          <p className="text-3xl font-bold mt-2">

            {criticalCount}

          </p>

        </div>


        <div
          className="
            bg-slate-900
            border
            border-slate-800
            rounded-xl
            p-5
          "
        >

          <p className="text-sm text-slate-400">

            High Alerts

          </p>

          <p className="text-3xl font-bold mt-2">

            {highCount}

          </p>

        </div>

      </div>


      {/* SUCCESS MESSAGE */}

      {message && (

        <div
          className="
            mb-6
            bg-green-950/40
            border
            border-green-800
            text-green-300
            rounded-xl
            p-4
          "
        >

          {message}

        </div>

      )}


      {/* ERROR MESSAGE */}

      {error && (

        <div
          className="
            mb-6
            bg-red-950/40
            border
            border-red-800
            text-red-300
            rounded-xl
            p-4
          "
        >

          {error}

        </div>

      )}


      {/* ALERT LIST */}

      <div className="grid gap-5">


        {alerts.length === 0 ? (

          <div
            className="
              bg-slate-900
              border
              border-slate-800
              rounded-xl
              p-10
              text-center
              text-slate-400
            "
          >

            No security alerts available.

          </div>

        ) : (

          alerts.map(
            (alert) => (

              <div
                key={alert.alert_id}

                className="
                  bg-slate-900
                  border
                  border-slate-800
                  rounded-xl
                  p-6
                  hover:border-slate-700
                  transition
                "
              >


                <div
                  className="
                    flex
                    flex-col
                    lg:flex-row
                    lg:justify-between
                    lg:items-start
                    gap-5
                  "
                >


                  {/* ALERT INFORMATION */}

                  <div className="flex-1">


                    <div
                      className="
                        flex
                        flex-wrap
                        items-center
                        gap-3
                        mb-4
                      "
                    >


                      <h2 className="text-lg font-bold">

                        Alert #{alert.alert_id}

                      </h2>


                      {/* SEVERITY */}

                      <span
                        className={`
                          border
                          px-3
                          py-1
                          rounded-full
                          text-xs
                          font-medium
                          ${severityClass(
                            alert.severity
                          )}
                        `}
                      >

                        {
                          alert.severity ||
                          "Low"
                        }

                      </span>


                      {/* STATUS */}

                      <span
                        className={`
                          border
                          px-3
                          py-1
                          rounded-full
                          text-xs
                          font-medium
                          ${statusClass(
                            alert.status
                          )}
                        `}
                      >

                        {
                          alert.status ||
                          "Unread"
                        }

                      </span>


                    </div>


                    {/* MESSAGE */}

                    <p className="text-slate-200">

                      {
                        alert.message ||
                        "Threat alert generated."
                      }

                    </p>


                    {/* DETAILS */}

                    <div
                      className="
                        mt-5
                        grid
                        grid-cols-1
                        md:grid-cols-2
                        gap-3
                        text-sm
                      "
                    >


                      <div>

                        <span className="text-slate-500">

                          Finding ID:

                        </span>

                        <span className="ml-2 text-slate-300">

                          #
                          {
                            alert.finding_id
                          }

                        </span>

                      </div>


                      <div>

                        <span className="text-slate-500">

                          Created:

                        </span>

                        <span className="ml-2 text-slate-300">

                          {
                            alert.created_at
                              ? new Date(
                                  alert.created_at
                                ).toLocaleString()
                              : "-"
                          }

                        </span>

                      </div>


                    </div>

                  </div>


                  {/* ACTIONS */}

                  <div
                    className="
                      flex
                      flex-col
                      gap-2
                      min-w-40
                    "
                  >


                    {canManage ? (

                      <>


                        {alert.status ===
                        "Unread" ? (

                          <button
                            onClick={() =>
                              markAsRead(
                                alert.alert_id
                              )
                            }

                            className="
                              bg-blue-600
                              hover:bg-blue-700
                              px-5
                              py-2
                              rounded-lg
                              text-sm
                              font-semibold
                              transition
                            "
                          >

                            Mark as Read

                          </button>

                        ) : (

                          <button
                            onClick={() =>
                              markAsUnread(
                                alert.alert_id
                              )
                            }

                            className="
                              bg-slate-800
                              hover:bg-slate-700
                              border
                              border-slate-700
                              px-5
                              py-2
                              rounded-lg
                              text-sm
                              font-semibold
                              transition
                            "
                          >

                            Mark as Unread

                          </button>

                        )}


                      </>

                    ) : (

                      <div
                        className="
                          border
                          border-slate-700
                          bg-slate-800
                          rounded-lg
                          px-4
                          py-2
                          text-sm
                          text-slate-400
                          text-center
                        "
                      >

                        Read Only

                      </div>

                    )}


                  </div>


                </div>

              </div>

            )
          )

        )}


      </div>


      {/* VIEWER NOTICE */}

      {!canManage && (

        <div
          className="
            mt-6
            bg-slate-900
            border
            border-slate-800
            rounded-xl
            p-4
            text-sm
            text-slate-400
          "
        >

          Your account has read-only access.
          Only analysts and administrators can
          update alert status.

        </div>

      )}


    </div>

  )

}


export default Alerts