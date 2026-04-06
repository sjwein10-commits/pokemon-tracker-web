'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/auth-context'

interface Post {
  id: number
  title: string
  content: string
  author: string
  tag: string | null
  created_at: string
}

interface Comment {
  id: number
  content: string
  author: string
  created_at: string
}

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
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PostDetail() {
  const { id } = useParams<{ id: string }>()
  const { user, displayName } = useAuth()

  const [post, setPost]         = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [commentText, setCommentText] = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState('')

  const fetchData = useCallback(async () => {
    const [postRes, commentsRes] = await Promise.all([
      supabase.from('community_posts').select('*').eq('id', id).single(),
      supabase.from('community_comments').select('*').eq('post_id', id).order('created_at', { ascending: true }),
    ])
    if (!postRes.data) { setNotFound(true); setLoading(false); return }
    setPost(postRes.data)
    setComments(commentsRes.data ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !commentText.trim()) return
    setSubmitting(true)
    setError('')
    const { error: err } = await supabase.from('community_comments').insert({
      post_id: Number(id),
      content: commentText.trim(),
      author:  displayName,
      user_id: user.id,
    })
    if (err) {
      setError('Failed to post comment. Please try again.')
    } else {
      setCommentText('')
      await fetchData()
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <p className="text-slate-500 text-sm">Loading…</p>
      </div>
    )
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl font-bold mb-2">Post not found</p>
          <Link href="/community" className="text-red-400 text-sm hover:underline">← Back to Community</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-600 mb-8">
          <Link href="/community" className="hover:text-slate-400 transition">Community</Link>
          <span>/</span>
          <span className="text-slate-400 truncate max-w-xs">{post.title}</span>
        </div>

        {/* ── Post ──────────────────────────────────────────────────────── */}
        <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-6 mb-6">
          {post.tag && (
            <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border mb-3 ${TAG_COLORS[post.tag] ?? TAG_COLORS.General}`}>
              {post.tag}
            </span>
          )}
          <h1 className="text-2xl font-bold text-white tracking-tight mb-4 leading-snug">
            {post.title}
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {post.content}
          </p>
          <div className="flex items-center gap-3 mt-5 pt-5 border-t border-white/[0.06] text-xs text-slate-600">
            <span className="text-slate-500 font-medium">{post.author}</span>
            <span>·</span>
            <span>{relativeTime(post.created_at)}</span>
            <span>·</span>
            <span>{comments.length} comment{comments.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* ── Comments ──────────────────────────────────────────────────── */}
        {comments.length > 0 && (
          <div className="mb-6 space-y-3">
            <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-4">
              {comments.length} Comment{comments.length !== 1 ? 's' : ''}
            </h2>
            {comments.map((c) => (
              <div key={c.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap mb-3">
                  {c.content}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <span className="text-slate-500 font-medium">{c.author}</span>
                  <span>·</span>
                  <span>{relativeTime(c.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Comment form / auth gate ───────────────────────────────────── */}
        {user ? (
          <div className="bg-white/[0.025] border border-white/[0.08] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Leave a comment</h3>
              <span className="text-xs text-slate-500">as <span className="text-slate-300 font-medium">{displayName}</span></span>
            </div>
            <form onSubmit={handleComment} className="space-y-3">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment…"
                rows={4}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition resize-none"
              />
              {error && <p className="text-xs text-red-400/80">{error}</p>}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !commentText.trim()}
                  className="bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition"
                >
                  {submitting ? 'Posting…' : 'Comment'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl px-6 py-5 flex items-center justify-between gap-4">
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

        <div className="mt-8">
          <Link href="/community" className="text-xs text-slate-600 hover:text-slate-400 transition">
            ← Back to Community
          </Link>
        </div>

      </div>
    </div>
  )
}
