'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth-context'

interface Post {
  id: number
  title: string
  content: string
  author: string
  tag: string | null
  created_at: string
  community_comments: { count: number }[]
}

const TAGS = ['General', 'Price Talk', 'For Sale', 'Wanted', 'News', 'Strategy']

const TAG_COLORS: Record<string, string> = {
  'General':    'bg-slate-500/15 text-slate-400 border-slate-500/20',
  'Price Talk': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'For Sale':   'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  'Wanted':     'bg-amber-500/15 text-amber-400 border-amber-500/20',
  'News':       'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'Strategy':   'bg-purple-500/15 text-purple-400 border-purple-500/20',
}

function relativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Community() {
  const { user, displayName } = useAuth()

  const [posts, setPosts]         = useState<Post[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')

  const [title,   setTitle]   = useState('')
  const [content, setContent] = useState('')
  const [tag,     setTag]     = useState('')

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from('community_posts')
      .select('*, community_comments(count)')
      .order('created_at', { ascending: false })
    if (data) setPosts(data as Post[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !title.trim() || !content.trim()) return
    setSubmitting(true)
    setError('')
    const { error: err } = await supabase.from('community_posts').insert({
      title:   title.trim(),
      content: content.trim(),
      author:  displayName,
      tag:     tag || null,
      user_id: user.id,
    })
    if (err) {
      setError('Failed to post. Please try again.')
    } else {
      setTitle(''); setContent(''); setTag('')
      setShowForm(false)
      await fetchPosts()
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-[#09090b]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Community</h1>
            <p className="text-slate-500 mt-1.5 text-sm">
              Discuss cards, prices, and strategy with other collectors.
            </p>
          </div>
          {user ? (
            <button
              onClick={() => { setShowForm(!showForm); setError('') }}
              className={`shrink-0 text-sm font-semibold px-5 py-2.5 rounded-xl transition ${
                showForm
                  ? 'bg-white/[0.05] border border-white/[0.08] text-slate-400 hover:text-white'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20'
              }`}
            >
              {showForm ? 'Cancel' : '+ New Post'}
            </button>
          ) : (
            <Link
              href="/auth/login"
              className="shrink-0 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition shadow-lg shadow-red-500/20"
            >
              Log In to Post
            </Link>
          )}
        </div>

        {/* ── Create Post Form (logged in only) ─────────────────────────── */}
        {showForm && user && (
          <form
            onSubmit={handleSubmit}
            className="bg-white/[0.03] border border-white/[0.09] rounded-2xl p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">Create a post</h2>
              <span className="text-xs text-slate-500">Posting as <span className="text-slate-300 font-medium">{displayName}</span></span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Title <span className="text-red-400/80">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's on your mind?"
                  maxLength={120}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Content <span className="text-red-400/80">*</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share details, ask a question, or start a discussion..."
                  rows={5}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Tag <span className="text-slate-700">(optional)</span>
                </label>
                <select
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50 transition cursor-pointer"
                >
                  <option value="">No tag</option>
                  {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {error && <p className="text-xs text-red-400/80 mt-3">{error}</p>}

            <div className="flex justify-end mt-5">
              <button
                type="submit"
                disabled={submitting || !title.trim() || !content.trim()}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition"
              >
                {submitting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </form>
        )}

        {/* ── Auth nudge for logged-out users ───────────────────────────── */}
        {!user && !loading && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl px-6 py-5 mb-6 flex items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              Log in or create an account to join the discussion.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/auth/login" className="text-xs font-medium text-slate-400 hover:text-white border border-white/[0.08] px-3 py-1.5 rounded-lg transition">
                Log In
              </Link>
              <Link href="/auth/signup" className="text-xs font-semibold text-white bg-red-600 hover:bg-red-500 px-3.5 py-1.5 rounded-lg transition">
                Sign Up
              </Link>
            </div>
          </div>
        )}

        {/* ── Post Feed ─────────────────────────────────────────────────── */}
        {loading ? (
          <div className="text-center py-24 text-slate-500 text-sm">Loading posts…</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-slate-500 text-sm mb-2">No posts yet.</p>
            <p className="text-slate-700 text-xs">Be the first to start a discussion.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => {
              const commentCount = post.community_comments?.[0]?.count ?? 0
              return (
                <Link
                  key={post.id}
                  href={`/community/${post.id}`}
                  className="block bg-white/[0.025] hover:bg-white/[0.045] border border-white/[0.07] hover:border-white/[0.12] rounded-2xl p-5 transition-all"
                >
                  {post.tag && (
                    <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border mb-2.5 ${TAG_COLORS[post.tag] ?? TAG_COLORS.General}`}>
                      {post.tag}
                    </span>
                  )}
                  <h2 className="text-base font-semibold text-white mb-1.5 leading-snug">
                    {post.title}
                  </h2>
                  <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                    {post.content}
                  </p>
                  <div className="flex items-center gap-3 mt-4 text-xs text-slate-600">
                    <span className="text-slate-500 font-medium">{post.author}</span>
                    <span>·</span>
                    <span>{relativeTime(post.created_at)}</span>
                    <span>·</span>
                    <span>{commentCount} comment{commentCount !== 1 ? 's' : ''}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
