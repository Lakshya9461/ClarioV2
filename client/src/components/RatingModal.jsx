import React, { useState } from 'react';
import { feedbackApi } from '../services/api';
import confetti from 'canvas-confetti';
import { Star, X, MessageSquare, Loader2, CheckCircle2 } from 'lucide-react';

export const RatingModal = ({ isOpen, onClose, questionId, questionTitle, initialRating = 0 }) => {
  const [rating, setRating] = useState(initialRating || 5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) return;

    try {
      setSubmitting(true);
      const res = await feedbackApi.submitFeedback({
        questionId,
        rating,
        comment: comment.trim(),
      });

      if (res.success) {
        setSubmitted(true);
        confetti({
          particleCount: 70,
          spread: 50,
          origin: { y: 0.65 },
        });

        setTimeout(() => {
          onClose();
          setSubmitted(false);
        }, 1800);
      }
    } catch (err) {
      console.error('Failed submitting feedback:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="panel-elevated rounded-2xl max-w-md w-full border border-slate-800 overflow-hidden shadow-2xl animate-scale-in">
        <div className="p-5 border-b border-slate-800 bg-[#0a0f1a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
              <Star className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-base">Rate Viva Explanation</h3>
              <p className="text-xs font-mono text-slate-400 truncate max-w-[260px]">
                {questionTitle || 'Concept Answer'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close rating modal"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-pulse" />
            <h4 className="font-display font-bold text-white text-lg">Rating Logged Successfully</h4>
            <p className="text-xs text-slate-400 font-sans">
              Your feedback is aggregated on faculty curriculum analytics for concept clarity.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="text-center">
              <p className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mb-3">
                How clear and technically accurate was this explanation?
              </p>
              {/* Star Rating Select */}
              <div className="flex items-center justify-center gap-2.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`Rate ${star} out of 5 stars`}
                    className="p-1 transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        (hoverRating || rating) >= star
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Comment */}
            <div>
              <label htmlFor="rating-comment" className="block text-xs font-mono font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" /> Optional Faculty Notes
              </label>
              <textarea
                id="rating-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Suggest additions (e.g. 'Add memory diagram for pointers', 'Include time complexity bounds')..."
                rows={3}
                className="w-full bg-[#080c14] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white placeholder:text-slate-500 p-3 text-xs sm:text-sm rounded-lg transition-colors font-sans"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary text-xs py-2 px-3.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !rating}
                className="btn-primary text-xs py-2 px-4"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Rating</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default RatingModal;
