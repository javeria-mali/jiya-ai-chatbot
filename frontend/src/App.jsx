
import { useState, useEffect } from 'react'
import './App.css'

const API_URL = `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api`
const PROFILE_PIC = '/jiya.jpg'

function getDateGroup(item) {
  const dateValue =
    item.last_message_at ||
    item.updated_at ||
    item.created_at

  if (!dateValue) return 'Older'

  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) return 'Older'

  const now = new Date()

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  )

  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)

  const startOfPrevious7Days = new Date(startOfToday)
  startOfPrevious7Days.setDate(startOfPrevious7Days.getDate() - 7)

  if (date >= startOfToday) return 'Today'
  if (date >= startOfYesterday) return 'Yesterday'
  if (date >= startOfPrevious7Days) return 'Previous 7 Days'

  return 'Older'
}

function groupConversations(conversations) {
  const groups = [
    'Today',
    'Yesterday',
    'Previous 7 Days',
    'Older',
  ]

  const grouped = {
    Today: [],
    Yesterday: [],
    'Previous 7 Days': [],
    Older: [],
  }

  conversations.forEach((item) => {
    const group = getDateGroup(item)
    grouped[group].push(item)
  })

  return groups
    .filter((group) => grouped[group].length > 0)
    .map((group) => ({
      title: group,
      items: grouped[group],
    }))
}

function App() {
  const [authView, setAuthView] = useState('register')
  const [isLoggedIn, setIsLoggedIn] = useState(
    Boolean(localStorage.getItem('jiya_token'))
  )

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('jiya_user')) || null
    } catch {
      return null
    }
  })

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')

  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState('chat')

  const [conversations, setConversations] = useState([])
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [conversationsLoading, setConversationsLoading] = useState(false)

  function logout() {
    localStorage.removeItem('jiya_token')
    localStorage.removeItem('jiya_user')

    setUser(null)
    setIsLoggedIn(false)
    setMessages([])
    setConversations([])
    setActiveConversationId(null)
    setMessage('')
    setError('')
    setPassword('')
    setConfirmPassword('')
    setAuthView('login')
    setAuthSuccess('')
    setAuthError('')
  }

  async function apiRequest(path, options = {}) {
    const token = localStorage.getItem('jiya_token')

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })

    const data = await response.json().catch(() => ({}))

    if (response.status === 401) {
      logout()
      throw new Error('Your session has expired. Please sign in again.')
    }

    if (!response.ok) {
      throw new Error(data.detail || 'Something went wrong.')
    }

    return data
  }

  async function loadConversations() {
    setConversationsLoading(true)

    try {
      const data = await apiRequest('/chat/conversations')
      const items = Array.isArray(data)
        ? data
        : data.conversations || data.items || []

      setConversations(items)
    } catch (err) {
      setError(err.message || 'Could not load your conversations.')
    } finally {
      setConversationsLoading(false)
    }
  }

  useEffect(() => {
    if (isLoggedIn) {
      loadConversations()
    }
  }, [isLoggedIn])

  async function handleAuth(event) {
    event.preventDefault()
    setAuthError('')
    setAuthSuccess('')

    if (authView === 'register' && password !== confirmPassword) {
      setAuthError('Passwords do not match.')
      return
    }

    setAuthLoading(true)

    try {
      const endpoint =
        authView === 'register' ? '/auth/register' : '/auth/login'

      const body =
        authView === 'register'
          ? { name: name.trim(), email: email.trim(), password }
          : { email: email.trim(), password }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed.')
      }

      if (authView === 'register') {
        setAuthSuccess('Your account is ready! Please sign in.')
        setAuthView('login')
        setPassword('')
        setConfirmPassword('')
      } else {
        localStorage.setItem('jiya_token', data.access_token)
        localStorage.setItem('jiya_user', JSON.stringify(data.user))

        setUser(data.user)
        setMessages([])
        setConversations([])
        setActiveConversationId(null)
        setView('chat')
        setIsLoggedIn(true)
      }
    } catch (err) {
      setAuthError(err.message || 'Cannot connect to the backend.')
    } finally {
      setAuthLoading(false)
    }
  }

  async function startNewChat() {
    setError('')
    setMessage('')
    setMessages([])
    setActiveConversationId(null)
    setView('chat')

    try {
      const data = await apiRequest('/chat/conversations', {
        method: 'POST',
      })

      setActiveConversationId(data.conversation_id)

      setConversations((previous) => [
        data,
        ...previous.filter(
          (item) => item.conversation_id !== data.conversation_id
        ),
      ])
    } catch (err) {
      setActiveConversationId(null)
      setError(err.message || 'Could not create a new chat.')
    }
  }

  async function openSavedChat(item) {
    const id = item.conversation_id

    if (!id) {
      setError('This conversation has no conversation ID.')
      return
    }

    setError('')
    setLoading(false)
    setMessage('')
    setMessages([])
    setActiveConversationId(id)
    setView('chat')

    try {
      const data = await apiRequest(
        `/chat/conversations/${encodeURIComponent(id)}`
      )

      const savedMessages = (data.messages || []).flatMap((entry) => {
        if (entry.role && (entry.text || entry.content)) {
          return [{
            role: entry.role,
            text: entry.text || entry.content,
          }]
        }

        const pair = []

        if (entry.user_message) {
          pair.push({ role: 'user', text: entry.user_message })
        }

        if (entry.ai_reply) {
          pair.push({ role: 'assistant', text: entry.ai_reply })
        }

        return pair
      })

      setMessages(savedMessages)
    } catch (err) {
      setError(err.message || 'Could not open this conversation.')
    }
  }

  async function sendMessage(event) {
    event?.preventDefault()

    const text = message.trim()

    if (!text || loading) return

    setMessage('')
    setLoading(true)
    setError('')
    setView('chat')
    setMessages((previous) => [...previous, { role: 'user', text }])

    try {
      let conversationId = activeConversationId

      if (!conversationId) {
        const created = await apiRequest('/chat/conversations', {
          method: 'POST',
        })

        conversationId = created.conversation_id
        setActiveConversationId(conversationId)

        setConversations((previous) => [created, ...previous])
      }

      const data = await apiRequest('/chat/', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId,
        }),
      })

      setMessages((previous) => [
        ...previous,
        { role: 'assistant', text: data.reply },
      ])

      if (data.conversation_id) {
        setActiveConversationId(data.conversation_id)
      }

      await loadConversations()
    } catch (err) {
      setError(err.message || 'Message could not be sent.')
    } finally {
      setLoading(false)
    }
  }

  async function renameConversation(item) {
    const id = item.conversation_id
    if (!id) return

    const newTitle = window.prompt(
      'Enter a new title for this chat:',
      item.title || 'New Chat'
    )

    if (newTitle === null) return

    const title = newTitle.trim()

    if (!title || title.length > 100) {
      setError('Title must be between 1 and 100 characters.')
      return
    }

    setError('')

    try {
      await apiRequest(
        `/chat/conversations/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ title }),
        }
      )

      await loadConversations()
    } catch (err) {
      setError(err.message || 'Could not rename this chat.')
    }
  }

  async function deleteConversation(item) {
    const id = item.conversation_id
    if (!id) return

    const confirmed = window.confirm(
      `Delete "${item.title || 'New Chat'}"? This will permanently delete its saved messages.`
    )

    if (!confirmed) return

    setError('')

    try {
      await apiRequest(
        `/chat/conversations/${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      )

      setConversations((previous) =>
        previous.filter((chat) => chat.conversation_id !== id)
      )

      if (activeConversationId === id) {
        setActiveConversationId(null)
        setMessages([])
        setMessage('')
        setView('chat')
      }
    } catch (err) {
      setError(err.message || 'Could not delete this chat.')
    }
  }

  async function showHistory() {
    setView('history')
    setError('')
    await loadConversations()
  }

  const groupedConversations = groupConversations(conversations)

  if (!isLoggedIn) {
    return (
      <div className="auth-page">
        <div className="auth-leaf leaf-one">✿</div>
        <div className="auth-leaf leaf-two">❀</div>

        <form className="auth-card" onSubmit={handleAuth}>
          <div className="auth-mascot" aria-hidden="true">🐰</div>
          <div className="auth-logo">✿</div>
          <p className="auth-eyebrow">A LITTLE SPACE FOR BIG IDEAS</p>

          <h1>
            {authView === 'register'
              ? 'Create your account'
              : 'Welcome back, lovely!'}
          </h1>

          <p className="auth-subtitle">
            {authView === 'register'
              ? 'Join Jiya AI and make something wonderful.'
              : 'Your little AI corner is waiting for you.'}
          </p>

          {authView === 'register' && (
            <label className="auth-label">
              Full name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                minLength={2}
                maxLength={80}
                required
              />
            </label>
          )}

          <label className="auth-label">
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="auth-label">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={authView === 'register' ? 8 : 1}
              maxLength={128}
              required
            />
          </label>

          {authView === 'register' && (
            <label className="auth-label">
              Confirm password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Type it again"
                minLength={8}
                maxLength={128}
                required
              />
            </label>
          )}

          {authError && <p className="auth-error">{authError}</p>}
          {authSuccess && <p className="auth-success">{authSuccess}</p>}

          <button
            className="auth-submit"
            type="submit"
            disabled={authLoading}
          >
            {authLoading
              ? 'Please wait...'
              : authView === 'register'
                ? 'Create Account  →'
                : 'Sign In  →'}
          </button>

          <p className="auth-switch">
            {authView === 'register'
              ? 'Already have an account?'
              : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => {
                setAuthView(authView === 'register' ? 'login' : 'register')
                setAuthError('')
                setAuthSuccess('')
              }}
            >
              {authView === 'register' ? 'Sign in' : 'Register'}
            </button>
          </p>

          <p className="auth-footer">
            ♡ Made with love and a little AI magic ♡
          </p>
        </form>
      </div>
    )
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img
            className="brand-avatar"
            src={PROFILE_PIC}
            alt="Javeria"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <div>
            <h2>Jiya Assistant</h2>
            <p className="brand-caption">Your happy little AI space</p>
          </div>
        </div>

        <button className="new-chat" onClick={startNewChat}>
          <span>＋</span> New Chat
        </button>

        <div className="sidebar-section">
          <p className="section-title">YOUR WORKSPACE</p>

          <button
            className={`nav-item ${view === 'chat' ? 'active' : ''}`}
            onClick={() => setView('chat')}
          >
            ✧ &nbsp; Chat Assistant
          </button>

          <button
            className={`nav-item ${view === 'history' ? 'active' : ''}`}
            onClick={showHistory}
          >
            ◷ &nbsp; Chat History
          </button>

          <button
            className={`nav-item ${view === 'settings' ? 'active' : ''}`}
            onClick={() => setView('settings')}
          >
            ⚙ &nbsp; Settings
          </button>

          <p className="section-title" style={{ marginTop: '22px' }}>
            YOUR CHATS
          </p>

          {conversationsLoading && <p>Loading chats...</p>}

          {!conversationsLoading && conversations.length === 0 && (
            <p className="brand-caption">No saved chats yet.</p>
          )}

          {groupedConversations.map((group) => (
            <div className="conversation-group" key={group.title}>
              <p className="section-title conversation-group-title">
                {group.title}
              </p>

              {group.items.map((item) => (
                <div
                  key={item.conversation_id}
                  className="conversation-row"
                >
                  <button
                    className={`nav-item conversation-button ${
                      activeConversationId === item.conversation_id
                        ? 'active'
                        : ''
                    }`}
                    onClick={() => openSavedChat(item)}
                    title={item.title || 'New Chat'}
                  >
                    ♡ &nbsp; {item.title || 'New Chat'}
                  </button>

                  <button
                    className="conversation-action"
                    type="button"
                    title="Rename chat"
                    aria-label="Rename chat"
                    onClick={() => renameConversation(item)}
                  >
                    ✎
                  </button>

                  <button
                    className="conversation-action"
                    type="button"
                    title="Delete chat"
                    aria-label="Delete chat"
                    onClick={() => deleteConversation(item)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="sidebar-bottom">
          <div className="avatar">
            {(user?.name || 'J').charAt(0).toUpperCase()}
          </div>
          <div className="profile-info">
            <strong>{user?.name || 'Javeria Malik'}</strong>
            <p>{user?.email || 'Personal Workspace'}</p>
            <button className="logout-button" onClick={logout}>
              Log out
            </button>
          </div>
          <span className="sidebar-heart">♡</span>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-title">
            <span className="status-dot" />
            <span>
              {view === 'history'
                ? 'Chat History'
                : view === 'settings'
                  ? 'Settings'
                  : 'Jiya Assistant'}
            </span>
          </div>
          <span className="model-label">✿ ♡</span>
        </header>

        <section className="welcome">
          {view === 'chat' && (
            <>
              {messages.length === 0 && (
                <div className="welcome-content">
                  <img
                    className="welcome-avatar"
                    src={PROFILE_PIC}
                    alt="Javeria Malik"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />

                  <div className="welcome-mascot" aria-hidden="true">🐰</div>
                  <p className="eyebrow">YOUR PERSONAL AI ASSISTANT</p>
                  <h1>Hey {user?.name?.split(' ')[0] || 'there'}! ♡</h1>
                  <p className="subtitle">
                    What would you like to explore today?
                    I’m here to help you learn, create and dream.
                  </p>

                  <div className="suggestions">
                    <button
                      onClick={() =>
                        setMessage('Help me brainstorm project ideas')
                      }
                    >
                      <span>🌷</span>
                      <strong>Brainstorm ideas</strong>
                      <small>Explore something new</small>
                    </button>

                    <button
                      onClick={() => setMessage('Help me write some code')}
                    >
                      <span>🌱</span>
                      <strong>Write some code</strong>
                      <small>Build your next project</small>
                    </button>

                    <button
                      onClick={() => setMessage('Teach me something new')}
                    >
                      <span>✨</span>
                      <strong>Learn something</strong>
                      <small>Understand any topic</small>
                    </button>
                  </div>
                </div>
              )}

              <div className="messages">
                {messages.map((item, index) => (
                  <div
                    className={`message-row ${item.role}`}
                    key={`${index}-${item.role}`}
                  >
                    {item.role === 'assistant' && (
                      <div className="message-mascot" aria-hidden="true">
                        🐰
                      </div>
                    )}

                    <div className={`message ${item.role}`}>
                      <strong>
                        {item.role === 'user' ? 'You' : 'Jiya Assistant'}
                      </strong>
                      <p>{item.text}</p>
                    </div>

                    {item.role === 'user' && (
                      <div className="user-message-avatar">
                        {(user?.name || 'J').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="message-row assistant">
                    <div className="message-mascot">🐰</div>
                    <div className="message assistant">
                      <strong>Jiya Assistant</strong>
                      <p className="typing">
                        Thinking of something helpful... ✨
                      </p>
                    </div>
                  </div>
                )}

                {error && <p className="error-message">{error}</p>}
              </div>

              <form className="chat-box" onSubmit={sendMessage}>
                <span className="input-mascot" aria-hidden="true">🌷</span>
                <textarea
                  placeholder="Write your message here..."
                  rows="2"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                />

                <div className="chat-box-footer">
                  <span>♡ Ask anything, lovely</span>
                  <button
                    className="send-button"
                    type="submit"
                    aria-label="Send message"
                    disabled={loading || !message.trim()}
                  >
                    ↑
                  </button>
                </div>
              </form>

              {/* <p className="disclaimer">
                ✿ AI can make mistakes. Verify important information.
              </p> */}
            </>
          )}

          {view === 'history' && (
            <div className="history-panel">
              <h1>Your Chat History ♡</h1>
              <p className="subtitle">
                Your conversations saved in MongoDB.
              </p>

              {conversationsLoading && <p>Loading your chats...</p>}

              {!conversationsLoading && conversations.length === 0 && (
                <p>No saved conversations found yet.</p>
              )}

              {!conversationsLoading &&
                groupedConversations.map((group) => (
                  <div className="history-group" key={group.title}>
                    <h3>{group.title}</h3>

                    {group.items.map((item) => (
                      <div
                        className="history-item"
                        key={item.conversation_id}
                      >
                        <button
                          type="button"
                          onClick={() => openSavedChat(item)}
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                          }}
                        >
                          <strong>{item.title || 'New Chat'}</strong>
                          <p>
                            {item.updated_at
                              ? new Date(item.updated_at).toLocaleString()
                              : 'Saved conversation'}
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => renameConversation(item)}
                        >
                          Rename
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteConversation(item)}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                ))}

              {error && <p className="error-message">{error}</p>}
            </div>
          )}

          {view === 'settings' && (
            <div className="history-panel">
              <h1>Settings ♡</h1>
              <p className="subtitle">Your Jiya Assistant workspace.</p>
              {/* <p>AI model: openai/gpt-oss-20b</p>
              <p>Storage: MongoDB Atlas</p>
              <p>Backend: FastAPI</p> */}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
