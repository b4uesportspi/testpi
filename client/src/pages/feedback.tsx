import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import Navigation from '@/components/navigation';
import Footer from '@/components/footer';
import AnimatedPage from '@/components/animated-page';
import ParticleBackground from '@/components/particle-background';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { usePiNetwork } from '@/hooks/use-pi-network';

interface FeedbackReply {
  id: string;
  feedbackId: string;
  userId?: string | null;
  username: string;
  email?: string | null;
  profilePicture?: string | null;
  comment: string;
  created_at: string;
  updated_at?: string | null;
}

interface FeedbackEntry {
  id: string;
  userId?: string | null;
  username: string;
  email?: string | null;
  profilePicture?: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at?: string | null;
  replies: FeedbackReply[];
}

interface Profile {
  username: string;
  email?: string | null;
  isProfileVerified?: boolean;
}

function hasBeenEdited(createdAt?: string | null, updatedAt?: string | null) {
  if (!createdAt || !updatedAt) {
    return false;
  }

  return new Date(updatedAt).getTime() > new Date(createdAt).getTime() + 1000;
}

function normalizeIdentity(value?: string | null) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export default function FeedbackPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user } = usePiNetwork();
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [editFeedbackId, setEditFeedbackId] = useState<string | null>(null);
  const [editFeedbackComment, setEditFeedbackComment] = useState('');
  const [editFeedbackRating, setEditFeedbackRating] = useState(0);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [editReplyId, setEditReplyId] = useState<string | null>(null);
  const [editReplyComment, setEditReplyComment] = useState('');

  const { data, isLoading } = useQuery<{ feedbacks: FeedbackEntry[] }>({
    queryKey: ['/api/feedback'],
    enabled: isAuthenticated,
  });

  const feedbacks = data?.feedbacks || [];
  const currentUserId = user?.id || null;
  const currentUsername = profile?.username || user?.username || '';
  const currentEmail = profile?.email || user?.email || '';

  const averageRating = useMemo(() => {
    if (!feedbacks.length) return 0;
    return feedbacks.reduce((sum, item) => sum + item.rating, 0) / feedbacks.length;
  }, [feedbacks]);

  const refreshFeedbacks = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
  };

  const createFeedbackMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/feedback', {
        rating,
        comment,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Feedback submitted',
        description: data?.tokensAwarded
          ? `Thanks for sharing. +${data.tokensAwarded} ${data.tokenName || 'B4U Esports Token'} added.`
          : 'Thanks for sharing your rating and comment.',
      });
      setComment('');
      setRating(0);
      refreshFeedbacks();
    },
    onError: (error) => {
      toast({
        title: 'Submission failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  const editFeedbackMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PUT', '/api/feedback', {
        id: editFeedbackId,
        rating: editFeedbackRating,
        comment: editFeedbackComment,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Feedback updated',
        description: 'Your feedback has been updated.',
      });
      setEditFeedbackId(null);
      setEditFeedbackComment('');
      setEditFeedbackRating(0);
      refreshFeedbacks();
    },
    onError: (error) => {
      toast({
        title: 'Update failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  const createReplyMutation = useMutation({
    mutationFn: async ({ feedbackId, reply }: { feedbackId: string; reply: string }) => {
      const response = await apiRequest('POST', '/api/feedback/reply', {
        feedbackId,
        comment: reply,
      });
      return response.json();
    },
    onSuccess: (_data, variables) => {
      toast({
        title: 'Reply posted',
        description: 'Your reply is now visible to other users.',
      });
      setReplyDrafts((current) => ({ ...current, [variables.feedbackId]: '' }));
      setReplyingToId(null);
      refreshFeedbacks();
    },
    onError: (error) => {
      toast({
        title: 'Reply failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  const editReplyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PUT', '/api/feedback/reply', {
        id: editReplyId,
        comment: editReplyComment,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Reply updated',
        description: 'Your reply has been updated.',
      });
      setEditReplyId(null);
      setEditReplyComment('');
      refreshFeedbacks();
    },
    onError: (error) => {
      toast({
        title: 'Reply update failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  const isProfileVerified = profile?.isProfileVerified ?? user?.isProfileVerified;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation('/');
    }
  }, [authLoading, isAuthenticated, setLocation]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && profileLoaded && isProfileVerified === false) {
      toast({
        title: 'Verify your profile',
        description: 'Please verify your profile before submitting feedback.',
        variant: 'destructive',
      });
      setLocation('/dashboard');
    }
  }, [authLoading, isAuthenticated, profileLoaded, isProfileVerified, setLocation, toast]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    setProfileLoaded(false);

    async function fetchProfile() {
      try {
        const response = await apiRequest('GET', '/api/profile');
        const data = await response.json();
        setProfile(data);
      } catch {
        setProfile(null);
      } finally {
        setProfileLoaded(true);
      }
    }

    fetchProfile();
  }, [isAuthenticated]);

  const canSubmit = profileLoaded && isProfileVerified === true && rating > 0 && rating <= 5 && comment.trim().length > 0;
  const canSaveFeedbackEdit = editFeedbackRating > 0 && editFeedbackComment.trim().length > 0;
  const canSaveReplyEdit = editReplyComment.trim().length > 0;

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AnimatedPage className="min-h-screen bg-background text-foreground relative">
      <ParticleBackground />
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white">Feedback</h1>
              <p className="mt-3 text-base text-muted-foreground max-w-2xl">
                Read real user reviews, reply to the conversation, and edit only the feedback or replies you personally posted.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={() => setLocation('/dashboard')}>
                Back to Dashboard
              </Button>
              <Badge variant="secondary">Community feedback</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
            <Card className="bg-slate-950/90 border border-white/10">
              <CardHeader>
                <CardTitle>Leave your feedback</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {profileLoaded && isProfileVerified === false && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
                    Your profile must be verified before you can submit feedback. Please verify your profile in the dashboard first.
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Rating</p>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        className={`text-3xl transition-all ${value <= rating ? 'text-yellow-400' : 'text-white/40'} hover:text-yellow-300`}
                        aria-label={`${value} star${value > 1 ? 's' : ''}`}
                      >
                        <i className="fas fa-star"></i>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Comment</p>
                  <Textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Tell us what you liked or what we can improve..."
                    rows={6}
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Signed in as:</p>
                    <p className="text-base font-medium text-white">{profile?.username || user?.username || 'User'}</p>
                  </div>

                  <Button
                    onClick={() => createFeedbackMutation.mutate()}
                    disabled={!canSubmit || createFeedbackMutation.isPending}
                  >
                    {createFeedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-950/90 border border-white/10">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl bg-white/5 p-4">
                  <p className="text-sm text-muted-foreground">Average rating</p>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-4xl font-bold text-yellow-400">{averageRating.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">based on {feedbacks.length} feedback{feedbacks.length === 1 ? '' : 's'}</span>
                  </div>
                </div>

                <div className="rounded-xl bg-white/5 p-4">
                  <p className="text-sm text-muted-foreground">How it works</p>
                  <ul className="mt-3 space-y-2 text-sm text-foreground">
                    <li>- Rate from 1 to 5 stars.</li>
                    <li>- Add feedback about your experience.</li>
                    <li>- Reply to other feedback if you want to join the conversation.</li>
                    <li>- Only you can edit your own feedback and replies.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold">All feedback</h2>
            <p className="text-sm text-muted-foreground">Showing latest {feedbacks.length} entries</p>
          </div>

          {isLoading ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-muted-foreground">Loading feedback...</div>
          ) : feedbacks.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-muted-foreground">
              No feedback yet. Be the first to share your rating.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {feedbacks.map((item) => {
                const isOwner =
                  (!!currentUserId && item.userId === currentUserId) ||
                  normalizeIdentity(item.username) === normalizeIdentity(currentUsername) ||
                  (!!item.email && normalizeIdentity(item.email) === normalizeIdentity(currentEmail));
                const isEditingFeedback = editFeedbackId === item.id;
                const replyDraft = replyDrafts[item.id] || '';

                return (
                  <Card key={item.id} className="bg-slate-950/90 border border-white/10">
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <i
                              key={value}
                              className={`fas fa-star ${value <= item.rating ? 'text-yellow-400' : 'text-white/20'}`}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          {hasBeenEdited(item.created_at, item.updated_at) && <Badge variant="secondary">Edited</Badge>}
                          <Badge>{new Date(item.created_at).toLocaleDateString()}</Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.username || 'user'}`}
                            alt={item.username || 'Anonymous'}
                            className="w-10 h-10 rounded-full object-cover bg-slate-800 shadow"
                          />
                          <p className="text-sm text-muted-foreground">{item.username || 'Anonymous'}</p>
                        </div>
                        {isOwner && !isEditingFeedback && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditFeedbackId(item.id);
                              setEditFeedbackComment(item.comment || '');
                              setEditFeedbackRating(item.rating);
                            }}
                          >
                            Edit
                          </Button>
                        )}
                      </div>

                      {isEditingFeedback ? (
                        <div className="space-y-3 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((value) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setEditFeedbackRating(value)}
                                className={`text-2xl transition-all ${value <= editFeedbackRating ? 'text-yellow-400' : 'text-white/40'} hover:text-yellow-300`}
                              >
                                <i className="fas fa-star"></i>
                              </button>
                            ))}
                          </div>
                          <Textarea
                            value={editFeedbackComment}
                            onChange={(event) => setEditFeedbackComment(event.target.value)}
                            rows={4}
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => editFeedbackMutation.mutate()}
                              disabled={!canSaveFeedbackEdit || editFeedbackMutation.isPending}
                            >
                              {editFeedbackMutation.isPending ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditFeedbackId(null);
                                setEditFeedbackComment('');
                                setEditFeedbackRating(0);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-base leading-7 text-foreground">{item.comment || 'No comment provided.'}</p>
                      )}

                      <div className="rounded-xl bg-white/5 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-white">Replies</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReplyingToId(replyingToId === item.id ? null : item.id)}
                          >
                            Reply
                          </Button>
                        </div>

                        {item.replies.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No replies yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {item.replies.map((reply) => {
                              const isReplyOwner =
                                (!!currentUserId && reply.userId === currentUserId) ||
                                normalizeIdentity(reply.username) === normalizeIdentity(currentUsername) ||
                                (!!reply.email && normalizeIdentity(reply.email) === normalizeIdentity(currentEmail));
                              const isEditingReply = editReplyId === reply.id;

                              return (
                                <div key={reply.id} className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-2">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                      <img
                                        src={reply.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.username || 'user'}`}
                                        alt={reply.username || 'Anonymous'}
                                        className="w-8 h-8 rounded-full object-cover bg-slate-800"
                                      />
                                      <span className="text-sm font-medium text-cyan-300">{reply.username}</span>
                                      {hasBeenEdited(reply.created_at, reply.updated_at) && (
                                        <Badge variant="secondary">Edited</Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(reply.created_at).toLocaleDateString()}
                                      </span>
                                      {isReplyOwner && !isEditingReply && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setEditReplyId(reply.id);
                                            setEditReplyComment(reply.comment);
                                          }}
                                        >
                                          Edit
                                        </Button>
                                      )}
                                    </div>
                                  </div>

                                  {isEditingReply ? (
                                    <div className="space-y-3">
                                      <Textarea
                                        value={editReplyComment}
                                        onChange={(event) => setEditReplyComment(event.target.value)}
                                        rows={3}
                                      />
                                      <div className="flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() => editReplyMutation.mutate()}
                                          disabled={!canSaveReplyEdit || editReplyMutation.isPending}
                                        >
                                          {editReplyMutation.isPending ? 'Saving...' : 'Save'}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setEditReplyId(null);
                                            setEditReplyComment('');
                                          }}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm leading-6 text-foreground">{reply.comment}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {replyingToId === item.id && (
                          <div className="space-y-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
                            <Textarea
                              value={replyDraft}
                              onChange={(event) =>
                                setReplyDrafts((current) => ({
                                  ...current,
                                  [item.id]: event.target.value,
                                }))
                              }
                              placeholder="Write your reply..."
                              rows={3}
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => createReplyMutation.mutate({ feedbackId: item.id, reply: replyDraft })}
                                disabled={!replyDraft.trim() || createReplyMutation.isPending}
                              >
                                {createReplyMutation.isPending ? 'Posting...' : 'Post Reply'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setReplyingToId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </AnimatedPage>
  );
}
