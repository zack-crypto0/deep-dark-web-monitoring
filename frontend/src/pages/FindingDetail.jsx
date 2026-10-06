import {

  useEffect,

  useState

} from "react"



import {

  useNavigate,

  useParams

} from "react-router-dom"



import {

  apiFetch

} from "../api"





function FindingDetail() {



  const {

    findingId

  } = useParams()



  const navigate =

    useNavigate()





  const [data, setData] =

    useState(null)



  const [loading, setLoading] =

    useState(true)



  const [updating, setUpdating] =

    useState(false)



  const [message, setMessage] =

    useState("")



  const [error, setError] =

    useState("")





  const user = JSON.parse(

    localStorage.getItem("user")

    || "null"

  )





  const canManage =

    user?.role === "admin"

    ||

    user?.role === "analyst"





  // =========================================================

  // FETCH FINDING DETAIL

  // =========================================================



  const fetchDetail = async () => {



    try {



      setError("")





      const response = await apiFetch(

        `/findings/${findingId}/detail`

      )





      const result =

        await response.json()





      if (!response.ok) {



        throw new Error(

          result.detail

          ||

          "Failed to load finding."

        )



      }





      setData(result)





    } catch (error) {



      console.error(

        "Finding detail error:",

        error

      )





      setError(

        error.message

        ||

        "Unable to load finding investigation."

      )





    } finally {



      setLoading(false)



    }



  }





  // =========================================================

  // INITIAL LOAD

  // =========================================================



  useEffect(() => {



    fetchDetail()



  }, [findingId])





  // =========================================================

  // UPDATE FINDING STATUS

  // =========================================================



  const updateStatus = async (

    newStatus

  ) => {



    try {



      setUpdating(true)



      setMessage("")



      setError("")





      const response = await apiFetch(

        `/findings/${findingId}/status`,

        {



          method: "PUT",



          headers: {

            "Content-Type":

              "application/json"

          },



          body: JSON.stringify({

            status: newStatus

          })



        }

      )





      const result =

        await response.json()





      if (!response.ok) {



        throw new Error(

          result.detail

          ||

          "Failed to update finding."

        )



      }





      setMessage(

        `Finding #${findingId} updated to ${newStatus}.`

      )





      await fetchDetail()





    } catch (error) {



      console.error(

        "Finding status error:",

        error

      )





      setError(

        error.message

        ||

        "Unable to update finding status."

      )





    } finally {



      setUpdating(false)



    }



  }





  // =========================================================

  // SEVERITY STYLE

  // =========================================================



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





  // =========================================================
  // INTEGRITY HELPERS
  // =========================================================

  const integrityClass = (
    status
  ) => {

    if (status === "verified") {
      return (
        "bg-green-950/40 " +
        "text-green-300 " +
        "border-green-800"
      )
    }

    if (status === "mismatch") {
      return (
        "bg-red-950/40 " +
        "text-red-300 " +
        "border-red-800"
      )
    }

    return (
      "bg-slate-800 " +
      "text-slate-300 " +
      "border-slate-700"
    )
  }


  const integrityLabel = (
    status
  ) => {

    if (status === "verified") {
      return "✓ VERIFIED"
    }

    if (status === "mismatch") {
      return "⚠ MISMATCH"
    }

    return "— UNAVAILABLE"
  }


  const formatSourceType = (
    sourceType
  ) => {

    if (!sourceType) {
      return "-"
    }

    return sourceType
      .replaceAll("_", " ")
      .replace(
        /\b\w/g,
        (character) =>
          character.toUpperCase()
      )
  }


  // =========================================================

  // LOADING

  // =========================================================



  if (loading) {



    return (



      <div className="text-slate-400">



        Loading investigation...



      </div>



    )



  }





  // =========================================================

  // ERROR / NO DATA

  // =========================================================



  if (!data) {



    return (



      <div>



        <button

          onClick={() =>

            navigate("/findings")

          }



          className="text-blue-400 hover:text-blue-300 mb-5"

        >



          ← Back to Findings



        </button>





        <p className="text-red-400">



          {

            error

            ||

            "Finding could not be loaded."

          }



        </p>



      </div>



    )



  }





  const finding =

    data.finding



  const source =

    data.source



  const watchlist =

    data.watchlist



  const alert =

    data.alert



  const riskAnalysis =

    data.risk_analysis





  const evidenceIntegrity =
    data.evidence_integrity || {}


  const overallIntegrity =
    evidenceIntegrity.status
    || "unavailable"


  const findingIntegrity =
    evidenceIntegrity.finding_integrity
    || finding.content_integrity
    || "unavailable"


  const sourceIntegrity =
    evidenceIntegrity.source_integrity
    || source?.content_integrity
    || "unavailable"


  const extractedEntities =
    data.extracted_entities || {}


  const extractedEmails =
    Array.isArray(
      extractedEntities.emails
    )
      ? extractedEntities.emails
      : []


  const extractedDomains =
    Array.isArray(
      extractedEntities.domains
    )
      ? extractedEntities.domains
      : []


  const extractedIpv4 =
    Array.isArray(
      extractedEntities.ipv4_addresses
    )
      ? extractedEntities.ipv4_addresses
      : []


  const extractedKeywords =
    Array.isArray(
      extractedEntities.keywords
    )
      ? extractedEntities.keywords
      : []


  const extractedSummary =
    extractedEntities.summary || {}


  const totalExtractedEntities =
    extractedSummary.total_entities
    ?? (
      extractedEmails.length
      + extractedDomains.length
      + extractedIpv4.length
      + extractedKeywords.length
    )


  const formatEntityCategory = (
    category
  ) => {

    if (!category) {
      return "General"
    }

    return category
      .replaceAll("_", " ")
      .replace(
        /\b\w/g,
        (character) =>
          character.toUpperCase()
      )
  }


  return (



    <div>





      {/* ================================================= */}

      {/* HEADER */}

      {/* ================================================= */}



      <div className="mb-8">





        <button

          onClick={() =>

            navigate("/findings")

          }



          className="text-blue-400 hover:text-blue-300 mb-5"

        >



          ← Back to Findings



        </button>





        <div className="flex flex-col xl:flex-row xl:justify-between xl:items-start gap-5">





          <div>



            <p className="text-sm text-slate-500">



              Investigation Case



            </p>





            <h1 className="text-3xl font-bold mt-1">



              Finding #{finding.finding_id}



            </h1>





            <p className="text-slate-400 mt-2">



              Review detection information,

              risk analysis, source provenance

              and investigation status.



            </p>



          </div>





          <span

            className={`

              inline-block

              border

              px-4

              py-2

              rounded-full

              font-semibold

              ${severityClass(

                finding.severity

              )}

            `}

          >



            {

              finding.severity

            }



          </span>





        </div>



      </div>





      {/* ================================================= */}

      {/* SUCCESS MESSAGE */}

      {/* ================================================= */}



      {message && (



        <div className="mb-6 bg-green-950/40 border border-green-800 text-green-300 p-4 rounded-xl">



          {message}



        </div>



      )}





      {/* ================================================= */}

      {/* ERROR MESSAGE */}

      {/* ================================================= */}



      {error && (



        <div className="mb-6 bg-red-950/40 border border-red-800 text-red-300 p-4 rounded-xl">



          {error}



        </div>



      )}





      {/* ================================================= */}

      {/* SUMMARY CARDS */}

      {/* ================================================= */}



      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">





        {/* MATCHED ASSET */}



        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">



          <p className="text-sm text-slate-500">



            Matched Asset



          </p>





          <p className="font-bold text-lg mt-2 break-all">



            {

              finding.matched_value

              ||

              "-"

            }



          </p>



        </div>





        {/* RISK SCORE */}



        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">



          <p className="text-sm text-slate-500">



            Risk Score



          </p>





          <p className="text-3xl font-bold mt-2">



            {

              finding.risk_score

              ??

              0

            }



            <span className="text-base text-slate-500">



              /100



            </span>



          </p>



        </div>





        {/* CATEGORY */}



        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">



          <p className="text-sm text-slate-500">



            Threat Category



          </p>





          <p className="font-semibold mt-2 capitalize">



            {

              finding.threat_category

              ||

              "-"

            }



          </p>



        </div>





        {/* DETECTED */}



        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">



          <p className="text-sm text-slate-500">



            Detected At



          </p>





          <p className="font-semibold mt-2">



            {

              finding.detected_at



                ? new Date(

                    finding.detected_at

                  ).toLocaleString()



                : "-"

            }



          </p>



        </div>





      </div>





      {/* ================================================= */}

      {/* RISK ANALYSIS */}

      {/* ================================================= */}



      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">





        <div className="mb-6">



          <h2 className="text-xl font-bold">



            Risk Analysis



          </h2>





          <p className="text-sm text-slate-400 mt-1">



            Explanation of how the finding

            risk score was calculated.



          </p>



        </div>





        {riskAnalysis ? (



          <div>





            {/* ========================================= */}

            {/* RISK OVERVIEW */}

            {/* ========================================= */}



            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">





              {/* FINAL SCORE */}



              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">



                <p className="text-sm text-slate-500">



                  Final Risk Score



                </p>





                <p className="text-4xl font-bold mt-2">



                  {

                    riskAnalysis.score

                  }



                  <span className="text-lg text-slate-500">



                    /100



                  </span>



                </p>



              </div>





              {/* CALCULATED SEVERITY */}



              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">



                <p className="text-sm text-slate-500">



                  Calculated Severity



                </p>





                <div className="mt-3">



                  <span

                    className={`

                      inline-block

                      border

                      px-3

                      py-1

                      rounded-full

                      text-sm

                      font-semibold

                      ${severityClass(

                        riskAnalysis.severity

                      )}

                    `}

                  >



                    {

                      riskAnalysis.severity

                    }



                  </span>



                </div>



              </div>





              {/* PRIMARY THREAT */}



              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">



                <p className="text-sm text-slate-500">



                  Primary Threat



                </p>





                <p className="text-xl font-bold mt-2 capitalize">



                  {

                    riskAnalysis.primary_threat

                    ||

                    "General"

                  }



                </p>



              </div>





            </div>





            {/* ========================================= */}

            {/* SCORE BREAKDOWN */}

            {/* ========================================= */}



            <div className="mb-6">





              <h3 className="font-semibold mb-4">



                Score Breakdown



              </h3>





              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">





                {/* BASE */}



                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">



                  <p className="text-sm text-slate-500">



                    Base Threat



                  </p>





                  <p className="text-2xl font-bold mt-2">



                    {

                      riskAnalysis.base_score

                      ??

                      0

                    }



                  </p>





                  <p className="text-xs text-slate-500 mt-1">



                    Primary threat weighting



                  </p>



                </div>





                {/* INDICATORS */}



                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">



                  <p className="text-sm text-slate-500">



                    Matched Indicators



                  </p>





                  <p className="text-2xl font-bold mt-2">



                    +



                    {

                      riskAnalysis.indicator_bonus

                      ??

                      0

                    }



                  </p>





                  <p className="text-xs text-slate-500 mt-1">



                    Threat indicator weighting



                  </p>



                </div>





                {/* ASSET */}



                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">



                  <p className="text-sm text-slate-500">



                    Asset Type



                  </p>





                  <p className="text-2xl font-bold mt-2">



                    +



                    {

                      riskAnalysis.asset_bonus

                      ??

                      0

                    }



                  </p>





                  <p className="text-xs text-slate-500 mt-1">



                    Monitored asset weighting



                  </p>



                </div>





                {/* CONTEXT */}



                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">



                  <p className="text-sm text-slate-500">



                    Exposure Context



                  </p>





                  <p className="text-2xl font-bold mt-2">



                    +



                    {

                      riskAnalysis.context_bonus

                      ??

                      0

                    }



                  </p>





                  <p className="text-xs text-slate-500 mt-1">



                    Exposure-related weighting



                  </p>



                </div>





              </div>



            </div>





            {/* ========================================= */}

            {/* MATCHED INDICATORS */}

            {/* ========================================= */}



            {

              riskAnalysis.matched_indicators?.length > 0 && (



                <div className="mb-6">





                  <h3 className="font-semibold mb-3">



                    Matched Threat Indicators



                  </h3>





                  <div className="flex flex-wrap gap-2">





                    {

                      riskAnalysis.matched_indicators.map(

                        (item, index) => (



                          <span

                            key={index}

                            className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg text-sm"

                          >



                            {

                              item.indicator

                            }



                            <span className="text-blue-400 ml-2">



                              +{

                                item.weight

                              }



                            </span>



                          </span>



                        )

                      )

                    }





                  </div>



                </div>



              )

            }





            {/* ========================================= */}

            {/* EXPOSURE CONTEXT */}

            {/* ========================================= */}



            {

              riskAnalysis.matched_context?.length > 0 && (



                <div className="mb-6">





                  <h3 className="font-semibold mb-3">



                    Exposure Context



                  </h3>





                  <div className="flex flex-wrap gap-2">





                    {

                      riskAnalysis.matched_context.map(

                        (item, index) => (



                          <span

                            key={index}

                            className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg text-sm"

                          >



                            {

                              item.indicator

                            }



                            <span className="text-orange-400 ml-2">



                              +{

                                item.weight

                              }



                            </span>



                          </span>



                        )

                      )

                    }





                  </div>



                </div>



              )

            }





            {/* ========================================= */}

            {/* SCORING FACTORS */}

            {/* ========================================= */}



            <div>





              <h3 className="font-semibold mb-3">



                Scoring Factors



              </h3>





              <div className="space-y-2">





                {

                  (

                    riskAnalysis.reasons

                    ??

                    []

                  ).map(

                    (reason, index) => (



                      <div

                        key={index}

                        className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-300"

                      >



                        <span className="text-blue-400 mr-2">



                          •



                        </span>





                        {

                          reason

                        }



                      </div>



                    )

                  )

                }





              </div>



            </div>





          </div>



        ) : (



          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-slate-400">



            Risk analysis information

            is not available for this finding.



          </div>



        )}



      </div>





      {/* ================================================= */}
      {/* EVIDENCE INTEGRITY */}
      {/* ================================================= */}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">

        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5 mb-6">

          <div>

            <p className="text-sm text-slate-500">
              Evidence Verification
            </p>

            <h2 className="text-xl font-bold mt-1">
              Evidence Integrity
            </h2>

            <p className="text-sm text-slate-400 mt-1">
              SHA-256 verification of the extracted content stored for this finding.
            </p>

          </div>


          <span
            className={`
              inline-flex
              w-fit
              items-center
              border
              px-4
              py-2
              rounded-full
              text-sm
              font-bold
              ${integrityClass(
                overallIntegrity
              )}
            `}
          >
            {
              integrityLabel(
                overallIntegrity
              )
            }
          </span>

        </div>


        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">

            <p className="text-sm text-slate-500">
              Overall Integrity
            </p>

            <span
              className={`
                inline-block
                mt-3
                border
                px-3
                py-1
                rounded-full
                text-sm
                font-semibold
                ${integrityClass(
                  overallIntegrity
                )}
              `}
            >
              {
                integrityLabel(
                  overallIntegrity
                )
              }
            </span>

          </div>


          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">

            <p className="text-sm text-slate-500">
              Finding Integrity
            </p>

            <span
              className={`
                inline-block
                mt-3
                border
                px-3
                py-1
                rounded-full
                text-sm
                font-semibold
                ${integrityClass(
                  findingIntegrity
                )}
              `}
            >
              {
                integrityLabel(
                  findingIntegrity
                )
              }
            </span>

          </div>


          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">

            <p className="text-sm text-slate-500">
              Source Integrity
            </p>

            <span
              className={`
                inline-block
                mt-3
                border
                px-3
                py-1
                rounded-full
                text-sm
                font-semibold
                ${integrityClass(
                  sourceIntegrity
                )}
              `}
            >
              {
                integrityLabel(
                  sourceIntegrity
                )
              }
            </span>

          </div>

        </div>


        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">

          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] border-b border-slate-800">

            <div className="p-4 text-sm text-slate-500">
              Hash Algorithm
            </div>

            <div className="p-4 font-semibold">
              {
                evidenceIntegrity.algorithm
                || finding.hash_algorithm
                || source?.hash_algorithm
                || "SHA-256"
              }
            </div>

          </div>


          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] border-b border-slate-800">

            <div className="p-4 text-sm text-slate-500">
              Calculated Hash
            </div>

            <div className="p-4 font-mono text-sm break-all text-blue-300">
              {
                evidenceIntegrity.calculated_hash
                || "Not available"
              }
            </div>

          </div>


          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] border-b border-slate-800">

            <div className="p-4 text-sm text-slate-500">
              Finding Hash
            </div>

            <div className="p-4 font-mono text-sm break-all">
              {
                evidenceIntegrity.finding_hash
                || finding.content_hash
                || "Not recorded"
              }
            </div>

          </div>


          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr]">

            <div className="p-4 text-sm text-slate-500">
              Source Hash
            </div>

            <div className="p-4 font-mono text-sm break-all">
              {
                evidenceIntegrity.source_hash
                || source?.content_hash
                || "Not recorded"
              }
            </div>

          </div>

        </div>


        <div
          className={`
            mt-5
            border
            rounded-xl
            p-4
            text-sm
            ${integrityClass(
              overallIntegrity
            )}
          `}
        >

          {
            overallIntegrity === "verified"
              ? "The stored extracted content matches both recorded SHA-256 hashes."
              : overallIntegrity === "mismatch"
                ? "Warning: the stored extracted content does not match at least one recorded SHA-256 hash."
                : "Integrity verification is unavailable because one or more legacy evidence hashes were not recorded."
          }

        </div>


        <p className="text-xs text-slate-500 mt-3">
          Integrity verification covers the extracted text stored by this system. It does not prove the authenticity or truthfulness of the external source.
        </p>

      </div>


      {/* ================================================= */}

      {/* INVESTIGATION STATUS */}

      {/* ================================================= */}



      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">





        <h2 className="text-xl font-bold">



          Investigation Status



        </h2>





        <p className="text-sm text-slate-400 mt-1 mb-5">



          Track the current investigation

          lifecycle of this finding.



        </p>





        {canManage ? (



          <select

            value={

              finding.status

              ||

              "New"

            }



            disabled={

              updating

            }



            onChange={(

              event

            ) =>

              updateStatus(

                event.target.value

              )

            }



            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 outline-none"

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



          <div className="inline-block bg-slate-800 border border-slate-700 px-4 py-2 rounded-lg">



            {

              finding.status

              ||

              "New"

            }



          </div>



        )}



      </div>





      {/* ================================================= */}

      {/* DETECTED CONTENT */}

      {/* ================================================= */}



      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">





        <h2 className="text-xl font-bold">



          Detected Content



        </h2>





        <p className="text-sm text-slate-400 mt-1 mb-5">



          Content associated with the

          monitored asset match.



        </p>





        <div className="bg-slate-950 border border-slate-800 rounded-lg p-5">





          <pre className="whitespace-pre-wrap break-words text-sm text-slate-300 font-mono">



            {

              finding.content

              ||

              "No content available."

            }



          </pre>





        </div>



      </div>





      {/* ================================================= */}
      {/* ADVANCED ENTITY EXTRACTION */}
      {/* ================================================= */}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">

        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5 mb-6">

          <div>

            <p className="text-sm text-slate-500">
              Automated Content Analysis
            </p>

            <h2 className="text-xl font-bold mt-1">
              Extracted Entities
            </h2>

            <p className="text-sm text-slate-400 mt-1">
              Email addresses, domains, IPv4 addresses and threat keywords extracted from the stored finding content.
            </p>

          </div>

          <div className="bg-blue-950/30 border border-blue-900 rounded-xl px-5 py-3 min-w-[150px]">

            <p className="text-xs text-blue-300">
              Total Entities
            </p>

            <p className="text-3xl font-bold text-blue-200 mt-1">
              {totalExtractedEntities}
            </p>

          </div>

        </div>


        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-500">Emails</p>
            <p className="text-2xl font-bold mt-2">
              {extractedSummary.email_count ?? extractedEmails.length}
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-500">Domains</p>
            <p className="text-2xl font-bold mt-2">
              {extractedSummary.domain_count ?? extractedDomains.length}
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-500">IPv4</p>
            <p className="text-2xl font-bold mt-2">
              {extractedSummary.ipv4_count ?? extractedIpv4.length}
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-500">Keywords</p>
            <p className="text-2xl font-bold mt-2">
              {extractedSummary.keyword_count ?? extractedKeywords.length}
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 col-span-2 md:col-span-1">
            <p className="text-xs text-slate-500">Extraction Status</p>
            <p className={`font-semibold mt-2 ${
              totalExtractedEntities > 0
                ? "text-green-400"
                : "text-slate-400"
            }`}>
              {
                totalExtractedEntities > 0
                  ? "● Entities Detected"
                  : "— No Entities"
              }
            </p>
          </div>

        </div>


        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">

            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-semibold">Email Addresses</h3>
              <span className="text-xs bg-blue-950/50 border border-blue-900 text-blue-300 px-2.5 py-1 rounded-full">
                {extractedEmails.length}
              </span>
            </div>

            {extractedEmails.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {extractedEmails.map((email) => (
                  <span
                    key={email}
                    className="bg-blue-950/40 border border-blue-900 text-blue-200 px-3 py-2 rounded-lg text-sm font-mono break-all"
                  >
                    {email}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No email entities detected.
              </p>
            )}

          </div>


          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">

            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-semibold">Domains</h3>
              <span className="text-xs bg-violet-950/50 border border-violet-900 text-violet-300 px-2.5 py-1 rounded-full">
                {extractedDomains.length}
              </span>
            </div>

            {extractedDomains.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {extractedDomains.map((domain) => (
                  <span
                    key={domain}
                    className="bg-violet-950/40 border border-violet-900 text-violet-200 px-3 py-2 rounded-lg text-sm font-mono break-all"
                  >
                    {domain}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No domain entities detected.
              </p>
            )}

          </div>


          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">

            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-semibold">IPv4 Addresses</h3>
              <span className="text-xs bg-cyan-950/50 border border-cyan-900 text-cyan-300 px-2.5 py-1 rounded-full">
                {extractedIpv4.length}
              </span>
            </div>

            {extractedIpv4.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {extractedIpv4.map((address) => (
                  <span
                    key={address}
                    className="bg-cyan-950/40 border border-cyan-900 text-cyan-200 px-3 py-2 rounded-lg text-sm font-mono"
                  >
                    {address}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No IPv4 entities detected.
              </p>
            )}

          </div>


          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">

            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-semibold">Threat Keywords</h3>
              <span className="text-xs bg-orange-950/50 border border-orange-900 text-orange-300 px-2.5 py-1 rounded-full">
                {extractedKeywords.length}
              </span>
            </div>

            {extractedKeywords.length > 0 ? (
              <div className="space-y-2">
                {extractedKeywords.map((item, index) => (
                  <div
                    key={`${item.keyword || "keyword"}-${item.category || "general"}-${index}`}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 bg-slate-900 border border-slate-800 rounded-lg p-3"
                  >
                    <span className="text-orange-200 font-semibold">
                      {item.keyword || "Unknown keyword"}
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-800 border border-slate-700 rounded-full px-3 py-1 w-fit">
                      {formatEntityCategory(item.category)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No threat keywords detected.
              </p>
            )}

          </div>

        </div>


        <div className="mt-5 bg-slate-950 border border-slate-800 rounded-lg p-4">
          <p className="text-xs text-slate-500">
            Extraction is performed from the finding content returned by the backend. These derived entities support investigation and matching; the original stored content remains the primary evidence record.
          </p>
        </div>

      </div>



      {/* ================================================= */}

      {/* SOURCE + WATCHLIST */}

      {/* ================================================= */}



      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">





        {/* =============================================== */}

        {/* SOURCE PROVENANCE */}

        {/* =============================================== */}



        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">





          <h2 className="text-xl font-bold mb-5">



            Source Provenance



          </h2>





          {source ? (



            <div className="space-y-4">





              <div>



                <p className="text-sm text-slate-500">



                  Source Name



                </p>





                <p className="font-semibold mt-1">



                  {

                    source.source_name

                    ||

                    "-"

                  }



                </p>



              </div>





              <div>



                <p className="text-sm text-slate-500">



                  Source Type



                </p>





                <p className="font-semibold mt-1 capitalize">



                  {
                    formatSourceType(
                      source.source_type
                    )
                  }



                </p>



              </div>





              <div>



                <p className="text-sm text-slate-500">



                  Source Reference



                </p>





                <p className="font-mono text-sm text-blue-300 mt-1 break-all">



                  {

                    source.source_reference

                    ||

                    "-"

                  }



                </p>



              </div>





              <div>



                <p className="text-sm text-slate-500">



                  Source First Recorded At



                </p>





                <p className="font-semibold mt-1">



                  {

                    source.collected_at



                      ? new Date(

                          source.collected_at

                        ).toLocaleString()



                      : "-"

                  }



                </p>



              </div>





              <div>

                <p className="text-sm text-slate-500">Evidence Collected At</p>

                <p className="font-semibold mt-1">

                  {data.finding.collected_at

                    ? new Date(data.finding.collected_at).toLocaleString()

                    : "Not recorded for this finding"}

                </p>

              </div>

              <div>

                <p className="text-sm text-slate-500">Finding Content SHA-256</p>

                <p className="font-mono text-sm mt-1 break-all">

                  {data.finding.content_hash || "Not recorded for this finding"}

                </p>

                <p className={`text-sm mt-2 ${data.finding.content_integrity === "mismatch" ? "text-red-400" : "text-slate-400"}`}>

                  {data.finding.content_integrity === "verified"

                    ? "Stored text matches the recorded hash."

                    : data.finding.content_integrity === "mismatch"

                      ? "Warning: stored text does not match the recorded hash."

                      : "Integrity check unavailable for this finding."}

                </p>

                <p className="text-xs text-slate-500 mt-1">

                  Hash covers extracted text, not the original HTML or source authenticity.

                </p>

              </div>

              <div>

                <p className="text-sm text-slate-500">
                  Source Snapshot SHA-256
                </p>

                <p className="font-mono text-sm mt-1 break-all">
                  {
                    source.content_hash
                    || "Not recorded for this source"
                  }
                </p>

              </div>


              <div>

                <p className="text-sm text-slate-500">
                  Source Integrity
                </p>

                <span
                  className={`
                    inline-block
                    mt-2
                    border
                    px-3
                    py-1
                    rounded-full
                    text-sm
                    font-semibold
                    ${integrityClass(
                      sourceIntegrity
                    )}
                  `}
                >
                  {
                    integrityLabel(
                      sourceIntegrity
                    )
                  }
                </span>

              </div>


              {

                ["sample", "controlled_crawler"].includes(source.source_type)

                &&

                (



                  <div className="bg-blue-950/30 border border-blue-900 text-blue-300 p-3 rounded-lg text-sm">



                    Synthetic/test source used

                    for controlled FYP evaluation.



                  </div>



                )

              }





            </div>



          ) : (



            <p className="text-slate-500">



              Source information unavailable.



            </p>



          )}



        </div>





        {/* =============================================== */}

        {/* WATCHLIST */}

        {/* =============================================== */}



        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">





          <h2 className="text-xl font-bold mb-5">



            Watchlist Information



          </h2>





          {watchlist ? (



            <div className="space-y-4">





              <div>



                <p className="text-sm text-slate-500">



                  Asset Type



                </p>





                <p className="font-semibold capitalize mt-1">



                  {

                    watchlist.asset_type

                    ||

                    "-"

                  }



                </p>



              </div>





              <div>



                <p className="text-sm text-slate-500">



                  Monitored Asset



                </p>





                <p className="font-semibold mt-1 break-all">



                  {

                    watchlist.asset_value

                    ||

                    "-"

                  }



                </p>



              </div>





              <div>



                <p className="text-sm text-slate-500">



                  Category



                </p>





                <p className="font-semibold mt-1">



                  {

                    watchlist.category

                    ||

                    "-"

                  }



                </p>



              </div>





              <div>



                <p className="text-sm text-slate-500">



                  Watchlist Status



                </p>





                <p

                  className={

                    watchlist.status === "Active"



                      ? "text-green-400 font-semibold mt-1"



                      : "text-slate-400 font-semibold mt-1"

                  }

                >



                  ● {

                    watchlist.status

                    ||

                    "-"

                  }



                </p>



              </div>





            </div>



          ) : (



            <p className="text-slate-500">



              Watchlist information unavailable.



            </p>



          )}



        </div>





      </div>





      {/* ================================================= */}

      {/* RELATED SECURITY ALERT */}

      {/* ================================================= */}



      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">





        <h2 className="text-xl font-bold mb-5">



          Related Security Alert



        </h2>





        {alert ? (



          <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">





            <div>



              <p className="text-sm text-slate-500">



                Alert ID



              </p>





              <p className="font-semibold mt-1">



                #{

                  alert.alert_id

                }



              </p>



            </div>





            <div>



              <p className="text-sm text-slate-500">



                Severity



              </p>





              <p className="font-semibold mt-1">



                {

                  alert.severity

                  ||

                  "-"

                }



              </p>



            </div>





            <div>



              <p className="text-sm text-slate-500">



                Alert Status



              </p>





              <p className="font-semibold mt-1">



                {

                  alert.status

                  ||

                  "-"

                }



              </p>



            </div>





            <div>



              <p className="text-sm text-slate-500">



                Created



              </p>





              <p className="font-semibold mt-1">



                {

                  alert.created_at



                    ? new Date(

                        alert.created_at

                      ).toLocaleString()



                    : "-"

                }



              </p>



            </div>





            <div className="xl:col-span-4 bg-slate-950 border border-slate-800 rounded-lg p-4">





              <p className="text-sm text-slate-500 mb-2">



                Alert Message



              </p>





              <p className="text-slate-300">



                {

                  alert.message

                  ||

                  "No alert message available."

                }



              </p>





            </div>





          </div>



        ) : (



          <p className="text-slate-500">



            No related security alert found.



          </p>



        )}



      </div>





    </div>



  )



}





export default FindingDetail
