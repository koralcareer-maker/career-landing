"use client";

import type React from "react";
import { useState, useOptimistic, useTransition, useActionState, useEffect } from "react";
import { Heart, MessageCircle, Send, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { timeAgo, getInitials, POST_CATEGORY_LABELS } from "@/lib/utils";
import { createPost, likePost, addComment } from "@/lib/actions/community";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommentData {
  id: string;
  content: string;
  createdAt: Date | string;
  author: { name: string | null };
}

export interface PostData {
  id: string;
  content: string;
  category: string;
  createdAt: Date | string;
  author: { name: string | null; image: string | null };
  _count: { likes: number; comments: number };
  comments: CommentData[];
}

// ─── Category config ─────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  string,
  { label: string; emoji: string; variant: "green" | "teal" | "navy" | "gray" }
> = {
  WIN: { label: "הצלחה", emoji: "🏆", variant: "green" },
  TIP: { label: "טיפ", emoji: "💡", variant: "teal" },
  JOB: { label: "משרה", emoji: "💼", variant: "navy" },
  QUESTION: { label: "שאלה", emoji: "❓", variant: "gray" },
};

function CategoryBadge({ category }: { category: string }) {
  const cfg = CATEGORY_CONFIG[category] ?? { label: category, emoji: "", variant: "gray" as const };
  return (
    <Badge variant={cfg.variant} size="sm">
      {cfg.emoji} {cfg.label}
    </Badge>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, image, size = "md" }: { name: string | null; image: string | null; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name ?? ""}
        className={`${dim} rounded-full object-cover shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${dim} rounded-full bg-teal/20 text-teal font-bold flex items-center justify-center shrink-0`}
    >
      {getInitials(name)}
    </div>
  );
}

// ─── Comment Form ─────────────────────────────────────────────────────────────

function CommentForm({ postId, onDone }: { postId: string; onDone: () => void }) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setLoading(true);
    setError("");
    const res = await addComment(postId, value);
    setLoading(false);
    if (res?.error) {
      setError(res.error);
    } else {
      setValue("");
      onDone();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 mt-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="כתוב תגובה..."
        rows={2}
        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-navy text-sm placeholder:text-gray-400 focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none transition-colors resize-none"
        dir="rtl"
      />
      <Button size="sm" type="submit" loading={loading} className="shrink-0 mb-0.5">
        <Send size={14} />
      </Button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </form>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post, userId }: { post: PostData; userId: string }) {
  const [showComments, setShowComments] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [optimisticLikes, addOptimisticLike] = useOptimistic(
    post._count.likes,
    (state, delta: number) => state + delta
  );
  const [isPending, startTransition] = useTransition();

  function handleLike() {
    startTransition(async () => {
      addOptimisticLike(1);
      await likePost(post.id);
    });
  }

  const shownComments = showComments ? post.comments : post.comments.slice(0, 3);
  const hasMore = post.comments.length > 3 && !showComments;

  return (
    <Card className="w-full">
      <CardContent>
        {/* Author row */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar name={post.author.name} image={post.author.image} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-navy">{post.author.name ?? "חבר קהילה"}</span>
              <CategoryBadge category={post.category} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{timeAgo(post.createdAt)}</p>
          </div>
        </div>

        {/* Content */}
        <p className="text-sm text-gray-700 leading-relaxed mb-4 whitespace-pre-line">
          {post.content}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-4 text-sm border-t border-gray-100 pt-3">
          <button
            onClick={handleLike}
            disabled={isPending}
            className="flex items-center gap-1.5 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Heart size={15} className={isPending ? "text-red-400 fill-red-400" : ""} />
            <span>{optimisticLikes}</span>
          </button>
          <button
            onClick={() => {
              setShowComments(true);
              setShowCommentForm((v) => !v);
            }}
            className="flex items-center gap-1.5 text-gray-400 hover:text-teal transition-colors"
          >
            <MessageCircle size={15} />
            <span>{post._count.comments}</span>
          </button>
        </div>

        {/* Comments */}
        {(post.comments.length > 0 || showCommentForm) && (
          <div className="mt-3 space-y-2.5 border-t border-gray-50 pt-3">
            {shownComments.map((c) => (
              <div key={c.id} className="flex items-start gap-2">
                <Avatar name={c.author.name} image={null} size="sm" />
                <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                  <span className="text-xs font-semibold text-navy">{c.author.name ?? "חבר"} </span>
                  <span className="text-xs text-gray-600">{c.content}</span>
                  <p className="text-[10px] text-gray-300 mt-0.5">{timeAgo(c.createdAt)}</p>
                </div>
              </div>
            ))}

            {hasMore && (
              <button
                onClick={() => setShowComments(true)}
                className="text-xs text-teal hover:underline flex items-center gap-1 mt-1"
              >
                <ChevronDown size={12} />
                הצג עוד תגובות ({post.comments.length - 3})
              </button>
            )}

            {showComments && post.comments.length > 3 && (
              <button
                onClick={() => setShowComments(false)}
                className="text-xs text-gray-400 hover:underline flex items-center gap-1 mt-1"
              >
                <ChevronUp size={12} />
                הסתר תגובות
              </button>
            )}

            {showCommentForm && (
              <CommentForm postId={post.id} onDone={() => setShowCommentForm(false)} />
            )}
          </div>
        )}

        {/* Show comment form even if no comments */}
        {showCommentForm && post.comments.length === 0 && (
          <div className="mt-3 border-t border-gray-50 pt-3">
            <CommentForm postId={post.id} onDone={() => setShowCommentForm(false)} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Create Post Form ─────────────────────────────────────────────────────────

function CreatePostForm({ userName }: { userName: string | null }) {
  const [state, formAction, isPending] = useActionState(createPost, null);
  const [category, setCategory] = useState("QUESTION");
  const [content, setContent] = useState("");

  const categories = [
    { value: "QUESTION", label: "❓ שאלה" },
    { value: "WIN", label: "🏆 הצלחה" },
    { value: "TIP", label: "💡 טיפ" },
    { value: "JOB", label: "💼 משרה" },
  ];

  // Reset content on success
  useEffect(() => {
    if (state && "success" in state && state.success) {
      setContent("");
    }
  }, [state]);

  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-3 mb-3">
          <Avatar name={userName} image={null} />
          <p className="text-sm font-semibold text-navy">שתף עם הקהילה</p>
        </div>

        <form action={formAction} className="space-y-3">
          {/* Category selector */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  category === cat.value
                    ? "bg-teal text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <input type="hidden" name="category" value={category} />

          <textarea
            name="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              category === "WIN"
                ? "שתף הצלחה שלך עם הקהילה... 🎉"
                : category === "TIP"
                ? "איזה טיפ שימושי יש לך לשתף? 💡"
                : category === "JOB"
                ? "שתף משרה מעניינת שמצאת... 💼"
                : "שאל שאלה, בקש עזרה... ❓"
            }
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-navy text-sm placeholder:text-gray-400 focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none transition-colors resize-none"
            dir="rtl"
            required
            minLength={3}
          />

          {state && "error" in state && state.error && (
            <p className="text-xs text-red-500">{state.error}</p>
          )}

          {state && "success" in state && state.success && (
            <p className="text-xs text-green-600">הפוסט פורסם בהצלחה!</p>
          )}

          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={isPending} disabled={!content.trim()}>
              <Send size={14} />
              פרסם
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Main Community Client ────────────────────────────────────────────────────

export function CommunityClient({
  posts,
  userId,
  userName,
}: {
  posts: PostData[];
  userId: string;
  userName: string | null;
}) {
  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-navy mb-1">קהילה</h1>
        <p className="text-sm text-gray-500">שתף, שאל, ועזור לחברים אחרים בדרכם המקצועית</p>
      </div>

      {/* Create post */}
      <CreatePostForm userName={userName} />

      {/* Feed */}
      {posts.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">💬</div>
          <h3 className="font-bold text-navy text-lg mb-2">הקהילה שקטה כרגע</h3>
          <p className="text-sm text-gray-400">היה הראשון לפרסם ולהתחיל שיחה!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} userId={userId} />
          ))}
        </div>
      )}
    </div>
  );
}
