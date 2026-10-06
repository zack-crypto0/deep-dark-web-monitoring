import { useEffect, useState } from "react"
import { apiFetch } from "../api"


function UserManagement() {

  const [users, setUsers] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [message, setMessage] =
    useState("")

  const [error, setError] =
    useState("")

  const [creating, setCreating] =
    useState(false)


  const currentUser = JSON.parse(
    localStorage.getItem("user")
    || "null"
  )


  const [form, setForm] =
    useState({

      username: "",
      email: "",
      password: "",
      role: "analyst"

    })


  // ========================================
  // FETCH USERS
  // ========================================

  const fetchUsers = async () => {

    try {

      setError("")


      const response =
        await apiFetch(
          "/users/"
        )


      const data =
        await response.json()


      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Failed to load users"
        )

      }


      setUsers(data)


    } catch (error) {

      console.error(
        "Users fetch error:",
        error
      )


      setError(
        error.message ||
        "Unable to load users."
      )


    } finally {

      setLoading(false)

    }

  }


  // ========================================
  // INITIAL LOAD
  // ========================================

  useEffect(() => {

    fetchUsers()

  }, [])


  // ========================================
  // FORM CHANGE
  // ========================================

  const handleChange = (
    event
  ) => {

    const {
      name,
      value
    } = event.target


    setForm({
      ...form,
      [name]: value
    })

  }


  // ========================================
  // CREATE USER
  // ========================================

  const createUser = async (
    event
  ) => {

    event.preventDefault()

    setMessage("")
    setError("")
    setCreating(true)


    try {

      const response =
        await apiFetch(
          "/users/",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify(
              form
            )
          }
        )


      const data =
        await response.json()


      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Failed to create user"
        )

      }


      setMessage(
        "User account created successfully."
      )


      setForm({

        username: "",
        email: "",
        password: "",
        role: "analyst"

      })


      await fetchUsers()


    } catch (error) {

      console.error(
        "Create user error:",
        error
      )


      setError(
        error.message ||
        "Unable to create user."
      )


    } finally {

      setCreating(false)

    }

  }


  // ========================================
  // UPDATE ROLE
  // ========================================

  const updateRole = async (
    userId,
    role
  ) => {

    setMessage("")
    setError("")


    try {

      const response =
        await apiFetch(
          `/users/${userId}/role`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              role: role
            })
          }
        )


      const data =
        await response.json()


      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Failed to update role"
        )

      }


      setMessage(
        `User role updated to ${role}.`
      )


      await fetchUsers()


    } catch (error) {

      console.error(
        "Role update error:",
        error
      )


      setError(
        error.message ||
        "Unable to update role."
      )

    }

  }


  // ========================================
  // ACTIVATE / DEACTIVATE
  // ========================================

  const updateStatus = async (
    userId,
    isActive
  ) => {

    setMessage("")
    setError("")


    try {

      const response =
        await apiFetch(
          `/users/${userId}/status`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              is_active: isActive
            })
          }
        )


      const data =
        await response.json()


      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Failed to update account"
        )

      }


      setMessage(
        data.message
      )


      await fetchUsers()


    } catch (error) {

      console.error(
        "User status error:",
        error
      )


      setError(
        error.message ||
        "Unable to update account."
      )

    }

  }


  // ========================================
  // LOADING
  // ========================================

  if (loading) {

    return (

      <div className="text-slate-400">

        Loading user management...

      </div>

    )

  }


  return (

    <div>


      {/* PAGE HEADER */}

      <div className="mb-8">

        <h1 className="text-3xl font-bold">

          User Management

        </h1>


        <p className="text-slate-400 mt-1">

          Create accounts and manage
          role-based system access.

        </p>

      </div>


      {/* MESSAGE */}

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


      {/* CREATE USER */}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">

        <h2 className="text-xl font-bold mb-5">

          Create New User

        </h2>


        <form
          onSubmit={createUser}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
        >


          <div>

            <label className="block text-sm text-slate-400 mb-2">

              Username

            </label>

            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              required
              placeholder="e.g. analyst01"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500"
            />

          </div>


          <div>

            <label className="block text-sm text-slate-400 mb-2">

              Email

            </label>

            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="analyst@example.com"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500"
            />

          </div>


          <div>

            <label className="block text-sm text-slate-400 mb-2">

              Password

            </label>

            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength="8"
              placeholder="Minimum 8 characters"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500"
            />

          </div>


          <div>

            <label className="block text-sm text-slate-400 mb-2">

              Role

            </label>

            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 outline-none"
            >

              <option value="admin">
                Admin
              </option>

              <option value="analyst">
                Analyst
              </option>

              <option value="viewer">
                Viewer
              </option>

            </select>

          </div>


          <div className="md:col-span-2 xl:col-span-4">

            <button
              type="submit"
              disabled={creating}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 px-6 py-3 rounded-lg font-semibold"
            >

              {
                creating
                  ? "Creating..."
                  : "Create User"
              }

            </button>

          </div>

        </form>

      </div>


      {/* USER TABLE */}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">

        <table className="w-full">

          <thead className="bg-slate-800">

            <tr>

              <th className="p-4 text-left">
                ID
              </th>

              <th className="p-4 text-left">
                Username
              </th>

              <th className="p-4 text-left">
                Email
              </th>

              <th className="p-4 text-left">
                Role
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

            {users.length === 0 ? (

              <tr>

                <td
                  colSpan="7"
                  className="p-10 text-center text-slate-400"
                >

                  No user accounts found.

                </td>

              </tr>

            ) : (

              users.map(
                (user) => {

                  const isCurrentUser =
                    user.user_id ===
                    currentUser?.user_id


                  return (

                    <tr
                      key={user.user_id}
                      className="border-t border-slate-800"
                    >


                      <td className="p-4 text-slate-400">

                        #{user.user_id}

                      </td>


                      <td className="p-4">

                        <div className="font-semibold">

                          {user.username}

                        </div>


                        {isCurrentUser && (

                          <div className="text-xs text-blue-400 mt-1">

                            Current Account

                          </div>

                        )}

                      </td>


                      <td className="p-4 text-slate-300">

                        {user.email}

                      </td>


                      {/* ROLE */}

                      <td className="p-4">

                        <select
                          value={user.role}

                          disabled={
                            isCurrentUser
                          }

                          onChange={(
                            event
                          ) =>
                            updateRole(
                              user.user_id,
                              event.target.value
                            )
                          }

                          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 disabled:opacity-50"
                        >

                          <option value="admin">

                            Admin

                          </option>

                          <option value="analyst">

                            Analyst

                          </option>

                          <option value="viewer">

                            Viewer

                          </option>

                        </select>

                      </td>


                      {/* STATUS */}

                      <td className="p-4">

                        {user.is_active ? (

                          <span className="bg-green-900/40 text-green-300 border border-green-800 px-3 py-1 rounded-full text-sm">

                            Active

                          </span>

                        ) : (

                          <span className="bg-red-900/40 text-red-300 border border-red-800 px-3 py-1 rounded-full text-sm">

                            Inactive

                          </span>

                        )}

                      </td>


                      {/* CREATED */}

                      <td className="p-4 text-sm text-slate-400">

                        {
                          user.created_at
                            ? new Date(
                                user.created_at
                              ).toLocaleString()
                            : "-"
                        }

                      </td>


                      {/* ACTION */}

                      <td className="p-4">

                        {isCurrentUser ? (

                          <span className="text-sm text-slate-500">

                            Protected

                          </span>

                        ) : user.is_active ? (

                          <button
                            onClick={() =>
                              updateStatus(
                                user.user_id,
                                false
                              )
                            }

                            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-semibold"
                          >

                            Deactivate

                          </button>

                        ) : (

                          <button
                            onClick={() =>
                              updateStatus(
                                user.user_id,
                                true
                              )
                            }

                            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-semibold"
                          >

                            Activate

                          </button>

                        )}

                      </td>


                    </tr>

                  )

                }
              )

            )}

          </tbody>

        </table>

      </div>

    </div>

  )

}


export default UserManagement