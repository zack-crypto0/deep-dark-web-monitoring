import {
  useEffect,
  useState
} from "react"

import {
  apiFetch
} from "../api"


function Watchlist() {

  const [watchlists, setWatchlists] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [message, setMessage] =
    useState("")

  const [error, setError] =
    useState("")


  // ========================================
  // FILTERS
  // ========================================

  const [search, setSearch] =
    useState("")

  const [filterType, setFilterType] =
    useState("")

  const [filterStatus, setFilterStatus] =
    useState("")

  const [sort, setSort] =
    useState("newest")


  // ========================================
  // CREATE FORM
  // ========================================

  const [form, setForm] =
    useState({

      asset_type:
        "domain",

      asset_value:
        "",

      category:
        ""

    })


  // ========================================
  // EDITING
  // ========================================

  const [editingId, setEditingId] =
    useState(null)

  const [editForm, setEditForm] =
    useState({

      asset_type:
        "domain",

      asset_value:
        "",

      category:
        ""

    })


  // ========================================
  // CURRENT USER / RBAC
  // ========================================

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


  const canDelete =

    user?.role === "admin"


  // ========================================
  // FETCH WATCHLIST
  // ========================================

  const fetchWatchlists = async () => {

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


      if (filterType) {

        params.append(
          "asset_type",
          filterType
        )

      }


      if (filterStatus) {

        params.append(
          "status",
          filterStatus
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

            ? `/watchlists/?${query}`

            : "/watchlists/"

        )


      const data =
        await response.json()


      if (!response.ok) {

        throw new Error(

          data.detail

          ||

          "Failed to load watchlist."

        )

      }


      setWatchlists(
        data
      )


    } catch (error) {

      console.error(
        "Watchlist fetch error:",
        error
      )


      setError(

        error.message

        ||

        "Unable to load watchlist."

      )


    } finally {

      setLoading(false)

    }

  }


  // ========================================
  // INITIAL LOAD
  // ========================================

  useEffect(() => {

    fetchWatchlists()

  }, [])


  // ========================================
  // AUTO FILTER
  // ========================================

  useEffect(() => {

    fetchWatchlists()

  }, [
    filterType,
    filterStatus,
    sort
  ])


  // ========================================
  // SEARCH
  // ========================================

  const handleSearch = (
    event
  ) => {

    event.preventDefault()

    fetchWatchlists()

  }


  // ========================================
  // RESET FILTERS
  // ========================================

  const resetFilters = () => {

    setSearch("")

    setFilterType("")

    setFilterStatus("")

    setSort("newest")

  }


  // ========================================
  // FORM INPUT
  // ========================================

  const handleFormChange = (
    event
  ) => {

    const {
      name,
      value
    } = event.target


    setForm({

      ...form,

      [name]:
        value

    })

  }


  // ========================================
  // CREATE
  // ========================================

  const createWatchlist = async (
    event
  ) => {

    event.preventDefault()


    try {

      setSaving(true)

      setMessage("")

      setError("")


      const response =
        await apiFetch(
          "/watchlists/",
          {

            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json"

            },

            body:
              JSON.stringify(
                form
              )

          }
        )


      const data =
        await response.json()


      if (!response.ok) {

        throw new Error(

          data.detail

          ||

          "Failed to create watchlist asset."

        )

      }


      setMessage(
        "Monitored asset added successfully."
      )


      setForm({

        asset_type:
          "domain",

        asset_value:
          "",

        category:
          ""

      })


      await fetchWatchlists()


    } catch (error) {

      console.error(
        "Create watchlist error:",
        error
      )


      setError(

        error.message

        ||

        "Unable to create watchlist asset."

      )


    } finally {

      setSaving(false)

    }

  }


  // ========================================
  // START EDIT
  // ========================================

  const startEdit = (
    item
  ) => {

    setEditingId(
      item.watchlist_id
    )


    setEditForm({

      asset_type:
        item.asset_type,

      asset_value:
        item.asset_value,

      category:
        item.category || ""

    })


    setMessage("")

    setError("")

  }


  // ========================================
  // CANCEL EDIT
  // ========================================

  const cancelEdit = () => {

    setEditingId(
      null
    )

  }


  // ========================================
  // SAVE EDIT
  // ========================================

  const saveEdit = async (
    watchlistId
  ) => {

    try {

      setSaving(true)

      setMessage("")

      setError("")


      const response =
        await apiFetch(
          `/watchlists/${watchlistId}`,
          {

            method:
              "PUT",

            headers: {

              "Content-Type":
                "application/json"

            },

            body:
              JSON.stringify(
                editForm
              )

          }
        )


      const data =
        await response.json()


      if (!response.ok) {

        throw new Error(

          data.detail

          ||

          "Failed to update watchlist asset."

        )

      }


      setMessage(
        `Watchlist #${watchlistId} updated successfully.`
      )


      setEditingId(
        null
      )


      await fetchWatchlists()


    } catch (error) {

      console.error(
        "Edit watchlist error:",
        error
      )


      setError(

        error.message

        ||

        "Unable to update watchlist asset."

      )


    } finally {

      setSaving(false)

    }

  }


  // ========================================
  // UPDATE STATUS
  // ========================================

  const updateStatus = async (
    watchlistId,
    newStatus
  ) => {

    try {

      setMessage("")

      setError("")


      const response =
        await apiFetch(
          `/watchlists/${watchlistId}/status`,
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

          "Failed to update watchlist status."

        )

      }


      setMessage(

        `Watchlist #${watchlistId} changed to ${newStatus}.`

      )


      await fetchWatchlists()


    } catch (error) {

      console.error(
        "Watchlist status error:",
        error
      )


      setError(

        error.message

        ||

        "Unable to update watchlist status."

      )

    }

  }


  // ========================================
  // DELETE
  // ========================================

  const deleteWatchlist = async (
    watchlistId
  ) => {

    const confirmed =
      window.confirm(

        "Delete this watchlist asset?"

      )


    if (!confirmed) {

      return

    }


    try {

      setMessage("")

      setError("")


      const response =
        await apiFetch(
          `/watchlists/${watchlistId}`,
          {

            method:
              "DELETE"

          }
        )


      const data =
        await response.json()


      if (!response.ok) {

        throw new Error(

          data.detail

          ||

          "Failed to delete watchlist asset."

        )

      }


      setMessage(
        "Watchlist asset deleted successfully."
      )


      await fetchWatchlists()


    } catch (error) {

      console.error(
        "Delete watchlist error:",
        error
      )


      setError(

        error.message

        ||

        "Unable to delete watchlist asset."

      )

    }

  }


  // ========================================
  // STATUS STYLE
  // ========================================

  const statusClass = (
    status
  ) => {

    if (
      status === "Active"
    ) {

      return (
        "bg-green-900/40 "
        +
        "text-green-300 "
        +
        "border-green-800"
      )

    }


    return (
      "bg-slate-800 "
      +
      "text-slate-400 "
      +
      "border-slate-700"
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

          Watchlist Management

        </h1>


        <p className="text-slate-400 mt-1">

          Configure domains, emails,
          IP addresses and keywords
          monitored by the system.

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


      {/* ================================= */}
      {/* CREATE */}
      {/* ================================= */}

      {canManage && (

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">


          <h2 className="text-xl font-bold mb-5">

            Add Monitored Asset

          </h2>


          <form
            onSubmit={
              createWatchlist
            }
          >

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">


              <div>

                <label className="block text-sm text-slate-400 mb-2">

                  Asset Type

                </label>


                <select
                  name="asset_type"

                  value={
                    form.asset_type
                  }

                  onChange={
                    handleFormChange
                  }

                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 outline-none"
                >

                  <option value="domain">
                    Domain
                  </option>

                  <option value="email">
                    Email
                  </option>

                  <option value="ip">
                    IP Address
                  </option>

                  <option value="keyword">
                    Keyword
                  </option>

                </select>

              </div>


              <div>

                <label className="block text-sm text-slate-400 mb-2">

                  Asset Value

                </label>


                <input
                  name="asset_value"

                  value={
                    form.asset_value
                  }

                  onChange={
                    handleFormChange
                  }

                  required

                  placeholder="example.com"

                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500"
                />

              </div>


              <div>

                <label className="block text-sm text-slate-400 mb-2">

                  Category

                </label>


                <input
                  name="category"

                  value={
                    form.category
                  }

                  onChange={
                    handleFormChange
                  }

                  placeholder="Corporate Asset"

                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500"
                />

              </div>

            </div>


            <button
              type="submit"

              disabled={
                saving
              }

              className="mt-5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 px-6 py-3 rounded-lg font-semibold"
            >

              {
                saving
                  ? "Saving..."
                  : "Add to Watchlist"
              }

            </button>

          </form>

        </div>

      )}


      {/* ================================= */}
      {/* SEARCH / FILTER */}
      {/* ================================= */}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">


        <form
          onSubmit={
            handleSearch
          }
        >

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">


            <div>

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

                placeholder="Search monitored asset..."

                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 outline-none"
              />

            </div>


            <div>

              <label className="block text-sm text-slate-400 mb-2">

                Asset Type

              </label>


              <select
                value={
                  filterType
                }

                onChange={(
                  event
                ) =>
                  setFilterType(
                    event.target.value
                  )
                }

                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3"
              >

                <option value="">
                  All Types
                </option>

                <option value="domain">
                  Domain
                </option>

                <option value="email">
                  Email
                </option>

                <option value="ip">
                  IP Address
                </option>

                <option value="keyword">
                  Keyword
                </option>

              </select>

            </div>


            <div>

              <label className="block text-sm text-slate-400 mb-2">

                Status

              </label>


              <select
                value={
                  filterStatus
                }

                onChange={(
                  event
                ) =>
                  setFilterStatus(
                    event.target.value
                  )
                }

                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3"
              >

                <option value="">
                  All Status
                </option>

                <option value="Active">
                  Active
                </option>

                <option value="Inactive">
                  Inactive
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

                <option value="asset_az">
                  Asset A-Z
                </option>

                <option value="asset_za">
                  Asset Z-A
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

              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-5 py-2.5 rounded-lg font-semibold"
            >

              Reset Filters

            </button>

          </div>

        </form>

      </div>


      {/* RESULT INFO */}

      <div className="mb-4 flex justify-between">

        <p className="text-sm text-slate-400">

          Showing{" "}

          <span className="font-semibold text-white">

            {
              watchlists.length
            }

          </span>

          {" "}asset(s)

        </p>


        <p className="text-xs text-slate-500">

          Access:{" "}

          <span className="text-blue-400 capitalize">

            {
              user?.role
              || "unknown"
            }

          </span>

        </p>

      </div>


      {/* ================================= */}
      {/* TABLE */}
      {/* ================================= */}

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
                Asset
              </th>

              <th className="p-4 text-left">
                Category
              </th>

              <th className="p-4 text-left">
                Status
              </th>

              <th className="p-4 text-left">
                Created
              </th>

              <th className="p-4 text-left">
                Action
              </th>

            </tr>

          </thead>


          <tbody>


            {loading ? (

              <tr>

                <td
                  colSpan="7"
                  className="p-10 text-center text-slate-400"
                >

                  Loading watchlist...

                </td>

              </tr>

            ) : watchlists.length === 0 ? (

              <tr>

                <td
                  colSpan="7"
                  className="p-10 text-center text-slate-400"
                >

                  No monitored assets found.

                </td>

              </tr>

            ) : (

              watchlists.map(
                (item) => (

                  <tr
                    key={
                      item.watchlist_id
                    }

                    className="border-t border-slate-800 align-top"
                  >


                    <td className="p-4 text-slate-400">

                      #{item.watchlist_id}

                    </td>


                    {/* EDIT MODE */}

                    {
                      editingId
                      === item.watchlist_id
                        ? (

                          <>

                            <td className="p-4">

                              <select
                                value={
                                  editForm.asset_type
                                }

                                onChange={(
                                  event
                                ) =>
                                  setEditForm({

                                    ...editForm,

                                    asset_type:
                                      event.target.value

                                  })
                                }

                                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                              >

                                <option value="domain">
                                  Domain
                                </option>

                                <option value="email">
                                  Email
                                </option>

                                <option value="ip">
                                  IP
                                </option>

                                <option value="keyword">
                                  Keyword
                                </option>

                              </select>

                            </td>


                            <td className="p-4">

                              <input
                                value={
                                  editForm.asset_value
                                }

                                onChange={(
                                  event
                                ) =>
                                  setEditForm({

                                    ...editForm,

                                    asset_value:
                                      event.target.value

                                  })
                                }

                                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                              />

                            </td>


                            <td className="p-4">

                              <input
                                value={
                                  editForm.category
                                }

                                onChange={(
                                  event
                                ) =>
                                  setEditForm({

                                    ...editForm,

                                    category:
                                      event.target.value

                                  })
                                }

                                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                              />

                            </td>

                          </>

                        )
                        : (

                          <>

                            <td className="p-4 capitalize">

                              {
                                item.asset_type
                              }

                            </td>


                            <td className="p-4 font-semibold">

                              {
                                item.asset_value
                              }

                            </td>


                            <td className="p-4 text-slate-300">

                              {
                                item.category
                                || "-"
                              }

                            </td>

                          </>

                        )
                    }


                    {/* STATUS */}

                    <td className="p-4">

                      <span
                        className={`
                          inline-block
                          border
                          px-3
                          py-1
                          rounded-full
                          text-sm
                          ${statusClass(
                            item.status
                          )}
                        `}
                      >

                        {
                          item.status
                        }

                      </span>

                    </td>


                    {/* DATE */}

                    <td className="p-4 text-sm text-slate-400">

                      {
                        item.created_at
                          ? new Date(
                              item.created_at
                            ).toLocaleString()
                          : "-"
                      }

                    </td>


                    {/* ACTIONS */}

                    <td className="p-4">

                      {
                        canManage
                          ? (

                            <div className="flex flex-wrap gap-2">


                              {
                                editingId
                                === item.watchlist_id
                                  ? (

                                    <>

                                      <button
                                        onClick={() =>
                                          saveEdit(
                                            item.watchlist_id
                                          )
                                        }

                                        className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg text-sm"
                                      >

                                        Save

                                      </button>


                                      <button
                                        onClick={
                                          cancelEdit
                                        }

                                        className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg text-sm"
                                      >

                                        Cancel

                                      </button>

                                    </>

                                  )
                                  : (

                                    <>

                                      <button
                                        onClick={() =>
                                          startEdit(
                                            item
                                          )
                                        }

                                        className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-sm"
                                      >

                                        Edit

                                      </button>


                                      <button
                                        onClick={() =>
                                          updateStatus(

                                            item.watchlist_id,

                                            item.status
                                            === "Active"
                                              ? "Inactive"
                                              : "Active"

                                          )
                                        }

                                        className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg text-sm"
                                      >

                                        {
                                          item.status
                                          === "Active"
                                            ? "Disable"
                                            : "Enable"
                                        }

                                      </button>


                                      {
                                        canDelete && (

                                          <button
                                            onClick={() =>
                                              deleteWatchlist(
                                                item.watchlist_id
                                              )
                                            }

                                            className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-sm"
                                          >

                                            Delete

                                          </button>

                                        )
                                      }

                                    </>

                                  )
                              }

                            </div>

                          )
                          : (

                            <span className="text-sm text-slate-500">

                              Read Only

                            </span>

                          )
                      }

                    </td>


                  </tr>

                )
              )

            )}


          </tbody>

        </table>

      </div>


      {!canManage && (

        <div className="mt-5 bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-400">

          Your account has read-only access.
          Watchlist configuration can only be
          changed by analysts and administrators.

        </div>

      )}


    </div>

  )

}


export default Watchlist