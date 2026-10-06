import { useEffect, useState } from "react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

import { apiFetch } from "../api"


function Reports() {

  const [reportType, setReportType] =
    useState("Threat Summary")

  const [startDate, setStartDate] =
    useState("")

  const [endDate, setEndDate] =
    useState("")

  const [reportData, setReportData] =
    useState(null)

  const [history, setHistory] =
    useState([])

  const [loading, setLoading] =
    useState(false)

  const [historyLoading, setHistoryLoading] =
    useState(true)

  const [message, setMessage] =
    useState("")

  const [error, setError] =
    useState("")


  // =========================================
  // LOAD REPORT HISTORY
  // =========================================

  const fetchHistory = async () => {

    try {

      const response = await apiFetch(
        "/reports/history"
      )

      const data =
        await response.json()

      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Failed to load report history"
        )

      }

      setHistory(data)

    } catch (error) {

      console.error(
        "Report history error:",
        error
      )

    } finally {

      setHistoryLoading(false)

    }

  }


  // =========================================
  // INITIAL LOAD
  // =========================================

  useEffect(() => {

    fetchHistory()

  }, [])


  // =========================================
  // GENERATE REPORT
  // =========================================

  const generateReport = async () => {

    try {

      setLoading(true)
      setMessage("")
      setError("")

      const response = await apiFetch(
        "/reports/generate",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            report_type:
              reportType,

            start_date:
              startDate || null,

            end_date:
              endDate || null

          })
        }
      )


      const data =
        await response.json()


      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Failed to generate report"
        )

      }


      setReportData(data)

      setMessage(
        `Report #${data.report.report_id} generated successfully.`
      )

      await fetchHistory()

    } catch (error) {

      console.error(
        "Generate report error:",
        error
      )

      setError(
        error.message ||
        "Unable to generate report."
      )

    } finally {

      setLoading(false)

    }

  }


  // =========================================
  // CSV ESCAPE
  // =========================================

  const escapeCSV = (value) => {

    if (
      value === null ||
      value === undefined
    ) {
      return ""
    }


    const text =
      String(value)


    if (
      text.includes(",") ||
      text.includes('"') ||
      text.includes("\n")
    ) {

      return `"${text.replace(
        /"/g,
        '""'
      )}"`

    }


    return text

  }


  // =========================================
  // EXPORT FINDINGS CSV
  // =========================================

  const exportFindingsCSV = () => {

    setError("")

    if (
      !reportData ||
      reportData.findings.length === 0
    ) {

      setError(
        "No findings available to export."
      )

      return

    }


    const headers = [

      "Finding ID",
      "Matched Asset",
      "Category",
      "Risk Score",
      "Severity",
      "Status",
      "Detected At",
      "Content"

    ]


    const rows =
      reportData.findings.map(
        (finding) => [

          finding.finding_id,

          finding.matched_value,

          finding.threat_category,

          finding.risk_score,

          finding.severity,

          finding.status,

          finding.detected_at,

          finding.content

        ]
      )


    const csv = [

      headers,

      ...rows

    ]
      .map(
        (row) =>
          row
            .map(escapeCSV)
            .join(",")
      )
      .join("\n")


    const blob =
      new Blob(
        [csv],
        {
          type:
            "text/csv;charset=utf-8;"
        }
      )


    const url =
      URL.createObjectURL(
        blob
      )


    const link =
      document.createElement(
        "a"
      )


    link.href = url

    link.download =
      `findings-report-${reportData.report.report_id}.csv`


    document.body.appendChild(
      link
    )

    link.click()

    document.body.removeChild(
      link
    )

    URL.revokeObjectURL(
      url
    )

  }


  // =========================================
  // EXPORT ALERTS CSV
  // =========================================

  const exportAlertsCSV = () => {

    setError("")

    if (
      !reportData ||
      reportData.alerts.length === 0
    ) {

      setError(
        "No alerts available to export."
      )

      return

    }


    const headers = [

      "Alert ID",
      "Finding ID",
      "Message",
      "Severity",
      "Status",
      "Created At"

    ]


    const rows =
      reportData.alerts.map(
        (alert) => [

          alert.alert_id,

          alert.finding_id,

          alert.message,

          alert.severity,

          alert.status,

          alert.created_at

        ]
      )


    const csv = [

      headers,

      ...rows

    ]
      .map(
        (row) =>
          row
            .map(escapeCSV)
            .join(",")
      )
      .join("\n")


    const blob =
      new Blob(
        [csv],
        {
          type:
            "text/csv;charset=utf-8;"
        }
      )


    const url =
      URL.createObjectURL(
        blob
      )


    const link =
      document.createElement(
        "a"
      )


    link.href = url

    link.download =
      `alerts-report-${reportData.report.report_id}.csv`


    document.body.appendChild(
      link
    )

    link.click()

    document.body.removeChild(
      link
    )

    URL.revokeObjectURL(
      url
    )

  }


  // =========================================
  // EXPORT FULL PDF
  // =========================================

  const exportPDF = () => {

    setError("")

    if (!reportData) {

      setError(
        "Generate a report first before exporting PDF."
      )

      return

    }


    const doc =
      new jsPDF()


    const pageWidth =
      doc.internal.pageSize.getWidth()


    // =======================================
    // TITLE
    // =======================================

    doc.setFontSize(18)

    doc.text(
      "Deep Dark Web Monitoring System",
      pageWidth / 2,
      18,
      {
        align: "center"
      }
    )


    doc.setFontSize(14)

    doc.text(
      "Threat Intelligence Report",
      pageWidth / 2,
      27,
      {
        align: "center"
      }
    )


    doc.setFontSize(10)

    doc.text(
      `Report ID: #${reportData.report.report_id}`,
      14,
      40
    )


    doc.text(
      `Report Type: ${reportData.report.report_type}`,
      14,
      46
    )


    doc.text(
      `Generated By: ${reportData.report.generated_by}`,
      14,
      52
    )


    doc.text(
      `Generated At: ${new Date(
        reportData.report.generated_at
      ).toLocaleString()}`,
      14,
      58
    )


    const reportStart =
      reportData.report.start_date
        ? reportData.report.start_date
        : "All records"


    const reportEnd =
      reportData.report.end_date
        ? reportData.report.end_date
        : "All records"


    doc.text(
      `Date Range: ${reportStart} - ${reportEnd}`,
      14,
      64
    )


    // =======================================
    // EXECUTIVE SUMMARY
    // =======================================

    doc.setFontSize(13)

    doc.text(
      "1. Executive Summary",
      14,
      77
    )


    doc.setFontSize(10)


    const summaryText =
      "This report summarizes threat findings and security alerts recorded by the Deep Dark Web Monitoring System for the selected reporting period."


    const summaryLines =
      doc.splitTextToSize(
        summaryText,
        180
      )


    doc.text(
      summaryLines,
      14,
      84
    )


    // =======================================
    // SUMMARY TABLE
    // =======================================

    autoTable(
      doc,
      {

        startY: 98,

        head: [[
          "Metric",
          "Count"
        ]],

        body: [

          [
            "Total Findings",
            reportData.summary
              .total_findings
          ],

          [
            "Total Alerts",
            reportData.summary
              .total_alerts
          ],

          [
            "Unread Alerts",
            reportData.summary
              .unread_alerts
          ],

          [
            "Critical Findings",
            reportData.summary
              .severity.critical
          ],

          [
            "High Findings",
            reportData.summary
              .severity.high
          ],

          [
            "Medium Findings",
            reportData.summary
              .severity.medium
          ],

          [
            "Low Findings",
            reportData.summary
              .severity.low
          ]

        ]

      }
    )


    // =======================================
    // FINDINGS SECTION
    // =======================================

    let currentY =
      doc.lastAutoTable.finalY + 12


    doc.setFontSize(13)

    doc.text(
      "2. Threat Findings",
      14,
      currentY
    )


    currentY += 6


    if (
      reportData.findings.length === 0
    ) {

      doc.setFontSize(10)

      doc.text(
        "No threat findings were recorded for this reporting period.",
        14,
        currentY + 4
      )

    } else {

      const findingRows =
        reportData.findings.map(
          (finding) => [

            finding.finding_id,

            finding.matched_value ||
              "-",

            finding.threat_category ||
              "-",

            finding.risk_score,

            finding.severity,

            finding.status,

            finding.detected_at
              ? new Date(
                  finding.detected_at
                ).toLocaleString()
              : "-"

          ]
        )


      autoTable(
        doc,
        {

          startY:
            currentY,

          head: [[

            "ID",
            "Asset",
            "Category",
            "Risk",
            "Severity",
            "Status",
            "Detected"

          ]],

          body:
            findingRows,

          styles: {
            fontSize: 7,
            cellPadding: 2
          }

        }
      )

    }


    // =======================================
    // ALERTS SECTION
    // =======================================

    currentY =
      doc.lastAutoTable
        ? doc.lastAutoTable.finalY + 12
        : currentY + 15


    if (
      currentY >
      doc.internal.pageSize.getHeight() - 30
    ) {

      doc.addPage()

      currentY = 20

    }


    doc.setFontSize(13)

    doc.text(
      "3. Security Alerts",
      14,
      currentY
    )


    currentY += 6


    if (
      reportData.alerts.length === 0
    ) {

      doc.setFontSize(10)

      doc.text(
        "No security alerts were recorded for this reporting period.",
        14,
        currentY + 4
      )

    } else {

      const alertRows =
        reportData.alerts.map(
          (alert) => [

            alert.alert_id,

            alert.finding_id,

            alert.severity,

            alert.status,

            alert.message,

            alert.created_at
              ? new Date(
                  alert.created_at
                ).toLocaleString()
              : "-"

          ]
        )


      autoTable(
        doc,
        {

          startY:
            currentY,

          head: [[

            "Alert ID",
            "Finding ID",
            "Severity",
            "Status",
            "Message",
            "Created"

          ]],

          body:
            alertRows,

          styles: {
            fontSize: 7,
            cellPadding: 2
          },

          columnStyles: {

            4: {
              cellWidth: 55
            }

          }

        }
      )

    }


    // =======================================
    // REPORT NOTES
    // =======================================

    currentY =
      doc.lastAutoTable
        ? doc.lastAutoTable.finalY + 12
        : currentY + 15


    if (
      currentY >
      doc.internal.pageSize.getHeight() - 35
    ) {

      doc.addPage()

      currentY = 20

    }


    doc.setFontSize(13)

    doc.text(
      "4. Report Notes",
      14,
      currentY
    )


    doc.setFontSize(9)


    const notes =
      "Risk scores and severity levels shown in this report are generated by the monitoring system based on the configured threat detection and matching rules. Findings should be reviewed by authorized analysts before any incident response decision is made."


    const noteLines =
      doc.splitTextToSize(
        notes,
        180
      )


    doc.text(
      noteLines,
      14,
      currentY + 7
    )


    // =======================================
    // FOOTER
    // =======================================

    const totalPages =
      doc.getNumberOfPages()


    for (
      let page = 1;
      page <= totalPages;
      page++
    ) {

      doc.setPage(page)

      doc.setFontSize(8)


      doc.text(
        `DDW Monitor - Report #${reportData.report.report_id}`,
        14,
        290
      )


      doc.text(
        `Page ${page} of ${totalPages}`,
        pageWidth - 14,
        290,
        {
          align: "right"
        }
      )

    }


    // =======================================
    // SAVE PDF
    // =======================================

    doc.save(
      `DDW-Threat-Report-${reportData.report.report_id}.pdf`
    )

  }


  // =========================================
  // PAGE
  // =========================================

  return (

    <div>


      {/* PAGE HEADER */}

      <div className="mb-8">

        <h1 className="text-3xl font-bold">
          Reports
        </h1>

        <p className="text-slate-400 mt-1">
          Generate threat intelligence reports,
          review historical reports and export
          investigation data.
        </p>

      </div>


      {/* SUCCESS */}

      {message && (

        <div className="mb-6 bg-green-950/40 border border-green-800 text-green-300 rounded-xl p-4">

          {message}

        </div>

      )}


      {/* ERROR */}

      {error && (

        <div className="mb-6 bg-red-950/40 border border-red-800 text-red-300 rounded-xl p-4">

          {error}

        </div>

      )}


      {/* REPORT CONFIG */}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">

        <h2 className="text-xl font-bold mb-5">
          Generate Report
        </h2>


        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">


          <div>

            <label className="block text-sm text-slate-400 mb-2">
              Report Type
            </label>

            <select
              value={reportType}

              onChange={(event) =>
                setReportType(
                  event.target.value
                )
              }

              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 outline-none"
            >

              <option value="Threat Summary">
                Threat Summary
              </option>

              <option value="Incident Report">
                Incident Report
              </option>

              <option value="Alert Report">
                Alert Report
              </option>

            </select>

          </div>


          <div>

            <label className="block text-sm text-slate-400 mb-2">
              Start Date
            </label>

            <input
              type="date"

              value={startDate}

              onChange={(event) =>
                setStartDate(
                  event.target.value
                )
              }

              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 outline-none"
            />

          </div>


          <div>

            <label className="block text-sm text-slate-400 mb-2">
              End Date
            </label>

            <input
              type="date"

              value={endDate}

              onChange={(event) =>
                setEndDate(
                  event.target.value
                )
              }

              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 outline-none"
            />

          </div>

        </div>


        <button
          onClick={generateReport}

          disabled={loading}

          className="mt-5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 px-6 py-3 rounded-lg font-semibold"
        >

          {
            loading
              ? "Generating..."
              : "Generate Report"
          }

        </button>

      </div>


      {/* GENERATED REPORT */}

      {reportData && (

        <>


          {/* REPORT INFO */}

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

              <div>

                <p className="text-sm text-slate-500">
                  Report ID
                </p>

                <p className="font-bold text-xl">
                  #{reportData.report.report_id}
                </p>

              </div>


              <div>

                <p className="text-sm text-slate-500">
                  Type
                </p>

                <p className="font-semibold">
                  {reportData.report.report_type}
                </p>

              </div>


              <div>

                <p className="text-sm text-slate-500">
                  Generated By
                </p>

                <p className="font-semibold">
                  {reportData.report.generated_by}
                </p>

              </div>


              <div>

                <p className="text-sm text-slate-500">
                  Generated At
                </p>

                <p className="font-semibold">

                  {new Date(
                    reportData.report.generated_at
                  ).toLocaleString()}

                </p>

              </div>

            </div>

          </div>


          {/* SUMMARY */}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">


            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

              <p className="text-sm text-slate-400">
                Total Findings
              </p>

              <p className="text-3xl font-bold mt-2">
                {reportData.summary.total_findings}
              </p>

            </div>


            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

              <p className="text-sm text-slate-400">
                Critical
              </p>

              <p className="text-3xl font-bold mt-2">
                {reportData.summary.severity.critical}
              </p>

            </div>


            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

              <p className="text-sm text-slate-400">
                High
              </p>

              <p className="text-3xl font-bold mt-2">
                {reportData.summary.severity.high}
              </p>

            </div>


            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

              <p className="text-sm text-slate-400">
                Total Alerts
              </p>

              <p className="text-3xl font-bold mt-2">
                {reportData.summary.total_alerts}
              </p>

            </div>

          </div>


          {/* EXPORT BUTTONS */}

          <div className="flex flex-wrap gap-3 mb-8">

            <button
              onClick={exportPDF}

              className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-lg font-semibold"
            >
              Export Full PDF
            </button>


            <button
              onClick={exportFindingsCSV}

              className="bg-green-600 hover:bg-green-700 px-5 py-3 rounded-lg font-semibold"
            >
              Export Findings CSV
            </button>


            <button
              onClick={exportAlertsCSV}

              className="bg-green-600 hover:bg-green-700 px-5 py-3 rounded-lg font-semibold"
            >
              Export Alerts CSV
            </button>

          </div>


          {/* FINDING PREVIEW */}

          <div className="mb-8">

            <h2 className="text-xl font-bold mb-4">
              Finding Preview
            </h2>


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

                  </tr>

                </thead>


                <tbody>

                  {reportData.findings.length === 0 ? (

                    <tr>

                      <td
                        colSpan="6"
                        className="p-8 text-center text-slate-400"
                      >

                        No findings in this report.

                      </td>

                    </tr>

                  ) : (

                    reportData.findings
                      .slice(0, 10)
                      .map(
                        (finding) => (

                          <tr
                            key={finding.finding_id}
                            className="border-t border-slate-800"
                          >

                            <td className="p-4">
                              #{finding.finding_id}
                            </td>

                            <td className="p-4">
                              {finding.matched_value}
                            </td>

                            <td className="p-4">
                              {finding.threat_category}
                            </td>

                            <td className="p-4">
                              {finding.risk_score}/100
                            </td>

                            <td className="p-4">
                              {finding.severity}
                            </td>

                            <td className="p-4">
                              {finding.status}
                            </td>

                          </tr>

                        )
                      )

                  )}

                </tbody>

              </table>

            </div>

          </div>

        </>

      )}


      {/* HISTORY */}

      <div>

        <h2 className="text-xl font-bold mb-4">
          Report History
        </h2>


        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">

          <table className="w-full">

            <thead className="bg-slate-800">

              <tr>

                <th className="p-4 text-left">
                  ID
                </th>

                <th className="p-4 text-left">
                  Type
                </th>

                <th className="p-4 text-left">
                  Generated By
                </th>

                <th className="p-4 text-left">
                  Generated At
                </th>

              </tr>

            </thead>


            <tbody>

              {historyLoading ? (

                <tr>

                  <td
                    colSpan="4"
                    className="p-8 text-center text-slate-400"
                  >
                    Loading report history...
                  </td>

                </tr>

              ) : history.length === 0 ? (

                <tr>

                  <td
                    colSpan="4"
                    className="p-8 text-center text-slate-400"
                  >
                    No reports generated yet.
                  </td>

                </tr>

              ) : (

                history.map(
                  (report) => (

                    <tr
                      key={report.report_id}
                      className="border-t border-slate-800"
                    >

                      <td className="p-4">
                        #{report.report_id}
                      </td>

                      <td className="p-4">
                        {report.report_type}
                      </td>

                      <td className="p-4">
                        {report.generated_by}
                      </td>

                      <td className="p-4 text-slate-400">

                        {new Date(
                          report.generated_at
                        ).toLocaleString()}

                      </td>

                    </tr>

                  )
                )

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>

  )

}


export default Reports