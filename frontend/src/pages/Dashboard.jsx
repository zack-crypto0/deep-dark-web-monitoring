import {
  useEffect,
  useState
} from "react"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts"

import {
  apiFetch
} from "../api"


function Dashboard() {

  const [dashboard, setDashboard] =
    useState({

      total_findings: 0,

      severity: {

        critical: 0,

        high: 0,

        medium: 0,

        low: 0

      },

      unread_alerts: 0,

      recent_findings: [],

      analytics: {

        findings_over_time: [],

        top_assets: []

      },

      scan_activity: {

        total_scans: 0,

        scans_last_7_days: 0,

        last_scan_at: null

      },

      system_status: {

        api: "offline",

        database: "disconnected",

        elasticsearch: "disconnected",

        matching_engine: "inactive",

        alert_engine: "inactive"

      }

    })


  const [loading, setLoading] =
    useState(true)

  const [scanning, setScanning] =
    useState(false)

  const [scanMessage, setScanMessage] =
    useState("")

  const [error, setError] =
    useState("")

  const [watchlists, setWatchlists] =
    useState([])

  const [selectedWatchlist, setSelectedWatchlist] =
    useState("all")


  const [scanSource, setScanSource] = useState("synthetic")

  const user = JSON.parse(
    localStorage.getItem("user")
    || "null"
  )


  const canScan =
    user?.role === "admin"
    ||
    user?.role === "analyst"


  // ========================================
  // LOAD DASHBOARD
  // ========================================

  const fetchDashboard = async () => {

    try {

      setError("")


      const response =
        await apiFetch(
          "/dashboard/summary"
        )


      const data =
        await response.json()


      if (!response.ok) {

        throw new Error(
          data.detail
          ||
          "Failed to load dashboard."
        )

      }


      setDashboard(data)


    } catch (error) {

      console.error(
        "Dashboard error:",
        error
      )


      setError(
        error.message
        ||
        "Unable to load dashboard."
      )


    } finally {

      setLoading(false)

    }

  }


  // ========================================
  // LOAD ACTIVE WATCHLISTS
  // ========================================

  const fetchWatchlists = async () => {

    try {

      const response =
        await apiFetch(
          "/watchlists/"
        )

      const data =
        await response.json()

      if (!response.ok) {

        throw new Error(
          data.detail
          ||
          "Failed to load watchlists."
        )

      }

      const items =
        Array.isArray(data)
          ? data
          : data.watchlists || []

      const activeWatchlists =
        items.filter(
          (item) =>
            String(item.status || "").toLowerCase()
            === "active"
        )

      setWatchlists(
        activeWatchlists
      )

    } catch (error) {

      console.error(
        "Watchlist error:",
        error
      )

    }

  }


  // ========================================
  // INITIAL LOAD
  // ========================================

  useEffect(() => {

    fetchDashboard()

    fetchWatchlists()

  }, [])


  // ========================================
  // RUN THREAT SCAN
  // ========================================

  const runThreatScan = async () => {

    try {

      setScanning(true)

      setScanMessage("")

      setError("")


      const params = new URLSearchParams({ scan_source: scanSource })
      if (selectedWatchlist !== "all") {
        params.set("watchlist_id", selectedWatchlist)
      }
      const scanUrl = `/scan/?${params.toString()}`

      const response =
        await apiFetch(
          scanUrl,
          {
            method: "POST"
          }
        )


      const data =
        await response.json()


      if (!response.ok) {

        throw new Error(
          data.detail
          ||
          "Threat scan request failed."
        )

      }


      const newFindings =
        data.new_findings
        ?? data.total_findings
        ?? 0


      const duplicatesSkipped =
        data.duplicates_skipped
        ?? 0


      const indexed =
        data.elasticsearch_indexed
        ?? 0


      setScanMessage(

        `${data.scan_type || "Scan"} completed. ` +
        `${data.total_records_scanned ?? 0} record(s) scanned. ` +

        `${newFindings} new finding(s) detected. ` +

        `${duplicatesSkipped} duplicate finding(s) skipped. ` +

        `${indexed} finding(s) indexed to Elasticsearch.`

      )


      await fetchDashboard()


    } catch (error) {

      console.error(
        "Threat scan error:",
        error
      )


      setError(
        error.message
        ||
        "Threat scan failed."
      )


    } finally {

      setScanning(false)

    }

  }


  // ========================================
  // SEVERITY CHART
  // ========================================

  const severityData = [

    {
      name: "Critical",
      value:
        dashboard.severity?.critical
        ?? 0
    },

    {
      name: "High",
      value:
        dashboard.severity?.high
        ?? 0
    },

    {
      name: "Medium",
      value:
        dashboard.severity?.medium
        ?? 0
    },

    {
      name: "Low",
      value:
        dashboard.severity?.low
        ?? 0
    }

  ]


  const severityColors = [

    "#ef4444",

    "#f97316",

    "#eab308",

    "#22c55e"

  ]


  const totalSeverity =
    severityData.reduce(
      (
        total,
        item
      ) =>
        total
        + item.value,
      0
    )


  // ========================================
  // STATUS HELPERS
  // ========================================

  const serviceStatusClass = (
    status
  ) => {

    if (
      status === "connected"
      ||
      status === "online"
      ||
      status === "active"
    ) {

      return (
        "text-green-400"
      )

    }


    return (
      "text-red-400"
    )

  }


  const severityClass = (
    severity
  ) => {

    if (
      severity === "Critical"
    ) {

      return (
        "text-red-400"
      )

    }


    if (
      severity === "High"
    ) {

      return (
        "text-orange-400"
      )

    }


    if (
      severity === "Medium"
    ) {

      return (
        "text-yellow-400"
      )

    }


    return (
      "text-green-400"
    )

  }


  // ========================================
  // LOADING
  // ========================================

  if (loading) {

    return (

      <div className="text-slate-400">

        Loading security dashboard...

      </div>

    )

  }


  return (

    <div>


      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      <div className="mb-8 flex flex-col xl:flex-row xl:justify-between xl:items-start gap-5">


        <div>

          <h1 className="text-3xl font-bold">

            Security Operations Dashboard

          </h1>


          <p className="text-slate-400 mt-1">

            Monitor threat activity,
            security alerts and monitored
            asset exposure.

          </p>

        </div>


        {canScan && (

          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <select
              aria-label="Scan Source"
              value={scanSource}
              onChange={(event) => setScanSource(event.target.value)}
              disabled={scanning}
              className="bg-slate-900 border border-slate-700 text-slate-200 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="synthetic">Synthetic Dataset</option>
              <option value="controlled">Controlled Crawler</option>
            </select>

            <select
              value={
                selectedWatchlist
              }

              onChange={(event) =>
                setSelectedWatchlist(
                  event.target.value
                )
              }

              disabled={
                scanning
              }

              className="bg-slate-900 border border-slate-700 text-slate-200 px-4 py-3 rounded-lg min-w-[240px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >

              <option value="all">
                All Active Assets
              </option>

              {watchlists.map(
                (watchlist) => (

                  <option
                    key={
                      watchlist.watchlist_id
                    }

                    value={
                      watchlist.watchlist_id
                    }
                  >

                    {
                      watchlist.asset_value
                      || watchlist.asset
                      || `Watchlist #${watchlist.watchlist_id}`
                    }

                    {" — "}

                    {
                      watchlist.asset_type
                      || "Asset"
                    }

                  </option>

                )
              )}

            </select>


            <button
              onClick={
                runThreatScan
              }

              disabled={
                scanning
              }

              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold"
            >

              {
                scanning
                  ? "Scanning..."
                  : "Run Threat Scan"
              }

            </button>

          </div>

        )}

      </div>


      {/* ================================= */}
      {/* SCAN MESSAGE */}
      {/* ================================= */}

      {scanMessage && (

        <div className="mb-6 bg-green-950/40 border border-green-800 text-green-300 rounded-xl p-4">

          {scanMessage}

        </div>

      )}


      {/* ================================= */}
      {/* ERROR */}
      {/* ================================= */}

      {error && (

        <div className="mb-6 bg-red-950/40 border border-red-800 text-red-300 rounded-xl p-4">

          {error}

        </div>

      )}


      {/* ================================= */}
      {/* SUMMARY CARDS */}
      {/* ================================= */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">


        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

          <p className="text-sm text-slate-400">

            Total Findings

          </p>

          <p className="text-4xl font-bold mt-3">

            {
              dashboard.total_findings
            }

          </p>

        </div>


        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

          <p className="text-sm text-slate-400">

            Critical Threats

          </p>

          <p className="text-4xl font-bold mt-3 text-red-400">

            {
              dashboard.severity
                ?.critical
              ?? 0
            }

          </p>

        </div>


        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

          <p className="text-sm text-slate-400">

            High Threats

          </p>

          <p className="text-4xl font-bold mt-3 text-orange-400">

            {
              dashboard.severity
                ?.high
              ?? 0
            }

          </p>

        </div>


        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

          <p className="text-sm text-slate-400">

            Unread Alerts

          </p>

          <p className="text-4xl font-bold mt-3">

            {
              dashboard.unread_alerts
            }

          </p>

        </div>

      </div>


      {/* ================================= */}
      {/* LINE + PIE CHART */}
      {/* ================================= */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">


        {/* FINDINGS OVER TIME */}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

          <div className="mb-6">

            <h2 className="text-xl font-bold">

              Findings Over Time

            </h2>

            <p className="text-sm text-slate-400 mt-1">

              Threat findings detected
              during the last 7 days.

            </p>

          </div>


          <div className="h-72">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <LineChart
                data={
                  dashboard.analytics
                    ?.findings_over_time
                  || []
                }
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                />

                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                />

                <YAxis
                  allowDecimals={false}
                  stroke="#94a3b8"
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor:
                      "#0f172a",

                    border:
                      "1px solid #334155",

                    borderRadius:
                      "8px"
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="count"
                  name="Findings"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{
                    r: 4
                  }}
                />

              </LineChart>

            </ResponsiveContainer>

          </div>

        </div>


        {/* SEVERITY DISTRIBUTION */}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

          <div className="mb-6">

            <h2 className="text-xl font-bold">

              Severity Distribution

            </h2>

            <p className="text-sm text-slate-400 mt-1">

              Distribution of detected
              findings by severity level.

            </p>

          </div>


          <div className="h-72">

            {
              totalSeverity === 0
                ? (

                  <div className="h-full flex items-center justify-center text-slate-500">

                    No severity data available.

                  </div>

                )
                : (

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >

                    <PieChart>

                      <Pie
                        data={
                          severityData
                        }

                        dataKey="value"

                        nameKey="name"

                        cx="50%"

                        cy="45%"

                        innerRadius={55}

                        outerRadius={90}
                      >

                        {
                          severityData.map(
                            (
                              entry,
                              index
                            ) => (

                              <Cell
                                key={
                                  entry.name
                                }

                                fill={
                                  severityColors[
                                    index
                                  ]
                                }
                              />

                            )
                          )
                        }

                      </Pie>

                      <Tooltip />

                      <Legend />

                    </PieChart>

                  </ResponsiveContainer>

                )
            }

          </div>

        </div>

      </div>


      {/* ================================= */}
      {/* TOP ASSETS + SCAN ACTIVITY */}
      {/* ================================= */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">


        {/* TOP ASSETS */}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

          <div className="mb-6">

            <h2 className="text-xl font-bold">

              Top Matched Assets

            </h2>

            <p className="text-sm text-slate-400 mt-1">

              Assets with the highest
              number of detected findings.

            </p>

          </div>


          <div className="h-72">

            {
              (
                dashboard.analytics
                  ?.top_assets
                  ?.length
                || 0
              ) === 0
                ? (

                  <div className="h-full flex items-center justify-center text-slate-500">

                    No matched asset data.

                  </div>

                )
                : (

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >

                    <BarChart
                      data={
                        dashboard.analytics
                          ?.top_assets
                        || []
                      }

                      layout="vertical"

                      margin={{
                        left: 20
                      }}
                    >

                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#334155"
                      />

                      <XAxis
                        type="number"
                        allowDecimals={false}
                        stroke="#94a3b8"
                      />

                      <YAxis
                        type="category"
                        dataKey="asset"
                        width={130}
                        stroke="#94a3b8"
                      />

                      <Tooltip
                        contentStyle={{
                          backgroundColor:
                            "#0f172a",

                          border:
                            "1px solid #334155",

                          borderRadius:
                            "8px"
                        }}
                      />

                      <Bar
                        dataKey="count"
                        name="Findings"
                        fill="#3b82f6"
                      />

                    </BarChart>

                  </ResponsiveContainer>

                )
            }

          </div>

        </div>


        {/* SCAN ACTIVITY */}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

          <h2 className="text-xl font-bold mb-6">

            Threat Scan Activity

          </h2>


          <div className="space-y-5">


            <div className="flex justify-between items-center border-b border-slate-800 pb-5">

              <div>

                <p className="text-slate-400 text-sm">

                  Total Scans

                </p>

                <p className="text-xs text-slate-500 mt-1">

                  Recorded scan events

                </p>

              </div>


              <p className="text-3xl font-bold">

                {
                  dashboard.scan_activity
                    ?.total_scans
                  ?? 0
                }

              </p>

            </div>


            <div className="flex justify-between items-center border-b border-slate-800 pb-5">

              <div>

                <p className="text-slate-400 text-sm">

                  Scans Last 7 Days

                </p>

                <p className="text-xs text-slate-500 mt-1">

                  Recent monitoring activity

                </p>

              </div>


              <p className="text-3xl font-bold">

                {
                  dashboard.scan_activity
                    ?.scans_last_7_days
                  ?? 0
                }

              </p>

            </div>


            <div>

              <p className="text-slate-400 text-sm">

                Last Threat Scan

              </p>


              <p className="font-semibold mt-2">

                {
                  dashboard.scan_activity
                    ?.last_scan_at
                    ? new Date(
                        dashboard
                          .scan_activity
                          .last_scan_at
                      ).toLocaleString()
                    : "No scans recorded"
                }

              </p>

            </div>

          </div>

        </div>

      </div>


      {/* ================================= */}
      {/* SYSTEM STATUS */}
      {/* ================================= */}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mt-8">


        <div className="mb-6">

          <h2 className="text-xl font-bold">

            System Status

          </h2>

          <p className="text-sm text-slate-400 mt-1">

            Current monitoring platform
            component status.

          </p>

        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">


          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">

            <p className="text-sm text-slate-500">

              API Server

            </p>

            <p
              className={`mt-2 font-semibold capitalize ${serviceStatusClass(
                dashboard.system_status
                  ?.api
              )}`}
            >

              ● {
                dashboard.system_status
                  ?.api
              }

            </p>

          </div>


          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">

            <p className="text-sm text-slate-500">

              PostgreSQL

            </p>

            <p
              className={`mt-2 font-semibold capitalize ${serviceStatusClass(
                dashboard.system_status
                  ?.database
              )}`}
            >

              ● {
                dashboard.system_status
                  ?.database
              }

            </p>

          </div>


          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">

            <p className="text-sm text-slate-500">

              Elasticsearch

            </p>

            <p
              className={`mt-2 font-semibold capitalize ${serviceStatusClass(
                dashboard.system_status
                  ?.elasticsearch
              )}`}
            >

              ● {
                dashboard.system_status
                  ?.elasticsearch
              }

            </p>

          </div>


          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">

            <p className="text-sm text-slate-500">

              Matching Engine

            </p>

            <p
              className={`mt-2 font-semibold capitalize ${serviceStatusClass(
                dashboard.system_status
                  ?.matching_engine
              )}`}
            >

              ● {
                dashboard.system_status
                  ?.matching_engine
              }

            </p>

          </div>


          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">

            <p className="text-sm text-slate-500">

              Alert Engine

            </p>

            <p
              className={`mt-2 font-semibold capitalize ${serviceStatusClass(
                dashboard.system_status
                  ?.alert_engine
              )}`}
            >

              ● {
                dashboard.system_status
                  ?.alert_engine
              }

            </p>

          </div>

        </div>

      </div>


      {/* ================================= */}
      {/* RECENT FINDINGS */}
      {/* ================================= */}

      <div className="mt-8">


        <div className="mb-4">

          <h2 className="text-xl font-bold">

            Recent Threat Findings

          </h2>

          <p className="text-sm text-slate-400 mt-1">

            Latest findings detected by
            the monitoring system.

          </p>

        </div>


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

              </tr>

            </thead>


            <tbody>


              {
                (
                  dashboard.recent_findings
                    ?.length
                  || 0
                ) === 0
                  ? (

                    <tr>

                      <td
                        colSpan="7"
                        className="p-10 text-center text-slate-400"
                      >

                        No threat findings
                        detected yet.

                      </td>

                    </tr>

                  )
                  : (

                    dashboard.recent_findings.map(
                      (
                        finding
                      ) => (

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


                          <td
                            className={`p-4 font-semibold ${severityClass(
                              finding.severity
                            )}`}
                          >

                            {
                              finding.severity
                              || "Low"
                            }

                          </td>


                          <td className="p-4">

                            {
                              finding.status
                              || "New"
                            }

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


                        </tr>

                      )
                    )

                  )
              }


            </tbody>

          </table>

        </div>

      </div>


    </div>

  )

}


export default Dashboard
