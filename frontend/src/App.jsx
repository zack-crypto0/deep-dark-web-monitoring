import { useState } from "react"

import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes
} from "react-router-dom"

import {
  apiFetch
} from "./api"

import Dashboard from "./pages/Dashboard"
import Watchlist from "./pages/Watchlist"
import Findings from "./pages/Findings"
import Alerts from "./pages/Alerts"
import Reports from "./pages/Reports"
import Login from "./pages/Login"
import UserManagement from "./pages/UserManagement"
import AuditLogs from "./pages/AuditLogs"
import FindingDetail from "./pages/FindingDetail"


function App() {

  const [token, setToken] =
    useState(
      localStorage.getItem(
        "auth_token"
      )
    )


  const [user, setUser] =
    useState(() => {

      const savedUser =
        localStorage.getItem(
          "user"
        )


      if (!savedUser) {

        return null

      }


      try {

        return JSON.parse(
          savedUser
        )

      } catch {

        return null

      }

    })


  // ========================================
  // LOGIN
  // ========================================

  const handleLoginSuccess = (
    newToken,
    userData
  ) => {

    localStorage.setItem(
      "auth_token",
      newToken
    )


    localStorage.setItem(
      "user",
      JSON.stringify(
        userData
      )
    )


    setToken(newToken)

    setUser(userData)

  }


  // ========================================
  // LOGOUT
  // ========================================

  const handleLogout = async () => {

    try {

      if (token) {

        await apiFetch(
          "/auth/logout",
          {
            method: "POST"
          }
        )

      }

    } catch (error) {

      console.error(
        "Logout error:",
        error
      )

    } finally {

      localStorage.removeItem(
        "auth_token"
      )


      localStorage.removeItem(
        "user"
      )


      setToken(null)

      setUser(null)

    }

  }


  return (

    <BrowserRouter>


      {!token ? (

        <Routes>

          <Route
            path="*"

            element={

              <Login
                onLoginSuccess={
                  handleLoginSuccess
                }
              />

            }
          />

        </Routes>

      ) : (

        <div className="min-h-screen bg-slate-950 text-white flex">


          {/* ================================= */}
          {/* SIDEBAR */}
          {/* ================================= */}

          <aside className="w-64 bg-slate-900 border-r border-slate-800 min-h-screen relative">


            <div className="p-6 border-b border-slate-800">

              <h1 className="text-xl font-bold">

                DDW Monitor

              </h1>

              <p className="text-xs text-slate-400 mt-1">

                Threat Intelligence

              </p>

            </div>


            <nav className="p-4 space-y-2">


              <NavLink
                to="/"
                end

                className={
                  ({ isActive }) =>
                    `block px-4 py-3 rounded-lg transition ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-800"
                    }`
                }
              >

                Dashboard

              </NavLink>


              <NavLink
                to="/watchlist"

                className={
                  ({ isActive }) =>
                    `block px-4 py-3 rounded-lg transition ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-800"
                    }`
                }
              >

                Watchlist

              </NavLink>


              <NavLink
                to="/findings"

                className={
                  ({ isActive }) =>
                    `block px-4 py-3 rounded-lg transition ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-800"
                    }`
                }
              >

                Findings

              </NavLink>


              <NavLink
                to="/alerts"

                className={
                  ({ isActive }) =>
                    `block px-4 py-3 rounded-lg transition ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-800"
                    }`
                }
              >

                Alerts

              </NavLink>


              <NavLink
                to="/reports"

                className={
                  ({ isActive }) =>
                    `block px-4 py-3 rounded-lg transition ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-800"
                    }`
                }
              >

                Reports

              </NavLink>


              {/* ================================= */}
              {/* ADMIN ONLY */}
              {/* ================================= */}

              {
                user?.role ===
                "admin" && (

                  <>

                    <div className="pt-5 pb-2 px-4">

                      <p className="text-xs text-slate-500 font-semibold">

                        ADMINISTRATION

                      </p>

                    </div>


                    <NavLink
                      to="/users"

                      className={
                        ({ isActive }) =>
                          `block px-4 py-3 rounded-lg transition ${
                            isActive
                              ? "bg-blue-600 text-white"
                              : "text-slate-300 hover:bg-slate-800"
                          }`
                      }
                    >

                      User Management

                    </NavLink>


                    <NavLink
                      to="/audit"

                      className={
                        ({ isActive }) =>
                          `block px-4 py-3 rounded-lg transition ${
                            isActive
                              ? "bg-blue-600 text-white"
                              : "text-slate-300 hover:bg-slate-800"
                          }`
                      }
                    >

                      Audit Logs

                    </NavLink>

                  </>

                )
              }


            </nav>


            {/* ================================= */}
            {/* USER INFO */}
            {/* ================================= */}

            <div className="absolute bottom-0 w-full border-t border-slate-800 p-4 bg-slate-900">

              <p className="text-xs text-slate-500">

                Signed in as

              </p>

              <p className="font-semibold mt-1">

                {
                  user?.username ||
                  "User"
                }

              </p>

              <p className="text-xs text-blue-400 capitalize">

                {
                  user?.role ||
                  "Unknown"
                }

              </p>

            </div>


          </aside>


          {/* ================================= */}
          {/* MAIN */}
          {/* ================================= */}

          <div className="flex-1 min-w-0">


            {/* HEADER */}

            <header className="bg-slate-900 border-b border-slate-800 px-8 py-4 flex justify-between items-center">


              <div>

                <h2 className="font-bold text-lg">

                  Deep Dark Web Monitoring System

                </h2>


                <p className="text-sm text-slate-400">

                  Threat Intelligence Platform

                </p>

              </div>


              <div className="flex items-center gap-5">


                <div className="text-right">

                  <p className="font-semibold">

                    {
                      user?.username ||
                      "User"
                    }

                  </p>


                  <p className="text-xs text-slate-400 capitalize">

                    {
                      user?.role ||
                      "Unknown"
                    }

                  </p>

                </div>


                <div className="h-8 w-px bg-slate-700" />


                <p className="text-sm text-green-400">

                  ● System Online

                </p>


                <button
                  onClick={
                    handleLogout
                  }

                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-semibold transition"
                >

                  Logout

                </button>

              </div>

            </header>


            {/* ================================= */}
            {/* ROUTES */}
            {/* ================================= */}

            <main className="p-8">


              <Routes>


                <Route
                  path="/"

                  element={
                    <Dashboard />
                  }
                />


                <Route
                  path="/watchlist"

                  element={
                    <Watchlist />
                  }
                />


                <Route
                  path="/findings"

                  element={
                    <Findings />
                  }
                />


                <Route
                  path="/findings/:findingId"

                  element={
                    <FindingDetail />
                  }
                />


                <Route
                  path="/alerts"

                  element={
                    <Alerts />
                  }
                />


                <Route
                  path="/reports"

                  element={
                    <Reports />
                  }
                />


                {/* ================================= */}
                {/* ADMIN USER MANAGEMENT */}
                {/* ================================= */}

                <Route
                  path="/users"

                  element={

                    user?.role ===
                    "admin"

                      ? (
                        <UserManagement />
                      )

                      : (
                        <Navigate
                          to="/"
                          replace
                        />
                      )

                  }
                />


                {/* ================================= */}
                {/* ADMIN AUDIT LOGS */}
                {/* ================================= */}

                <Route
                  path="/audit"

                  element={

                    user?.role ===
                    "admin"

                      ? (
                        <AuditLogs />
                      )

                      : (
                        <Navigate
                          to="/"
                          replace
                        />
                      )

                  }
                />


                {/* FALLBACK */}

                <Route
                  path="*"

                  element={
                    <Navigate
                      to="/"
                      replace
                    />
                  }
                />


              </Routes>

            </main>

          </div>

        </div>

      )}


    </BrowserRouter>

  )

}


export default App