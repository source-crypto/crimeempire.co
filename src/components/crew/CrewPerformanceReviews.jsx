import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Award, Target, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CrewPerformanceReviews({ crewId, playerData }) {
  const queryClient = useQueryClient();

  const { data: crewMembers = [] } = useQuery({
    queryKey: ['crewMembers', crewId],
    queryFn: () => base44.entities.CrewMember.filter({ crew_id: crewId }),
    enabled: !!crewId
  });

  const { data: performanceReviews = [] } = useQuery({
    queryKey: ['performanceReviews', crewId],
    queryFn: () => base44.entities.CrewPerformanceReview.filter({ crew_id: crewId }, '-created_date', 50),
    enabled: !!crewId
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['completedAssignments', crewId],
    queryFn: () => base44.entities.CrewAssignment.filter({ crew_id: crewId }),
    enabled: !!crewId
  });

  const generateReviewsMutation = useMutation({
    mutationFn: async () => {
      const reviews = [];

      for (const member of crewMembers) {
        const memberAssignments = assignments.filter(a => a.crew_member_id === member.id);
        const completed = memberAssignments.filter(a => a.status === 'completed').length;
        const failed = memberAssignments.filter(a => a.status === 'failed').length;

        const prompt = `Generate comprehensive AI performance review for crew member.

Member: ${member.member_name} (${member.member_type})
Skills: Combat ${member.skills?.combat || 0}, Stealth ${member.skills?.stealth || 0}, Leadership ${member.skills?.leadership || 0}
Loyalty: ${member.loyalty}/100
Assignments Completed: ${completed}
Assignments Failed: ${failed}

Analyze:
1. Overall performance score (0-100)
2. Top 3 strengths
3. Top 3 weaknesses  
4. 3-5 improvement recommendations
5. Skill progression analysis
6. Promotion readiness
7. Recommended training focus

Be detailed and specific.`;

        const analysis = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              overall_score: { type: "number" },
              strengths: {
                type: "array",
                items: { type: "string" }
              },
              weaknesses: {
                type: "array",
                items: { type: "string" }
              },
              improvement_recommendations: {
                type: "array",
                items: { type: "string" }
              },
              skill_progression: {
                type: "object",
                properties: {
                  combat_change: { type: "number" },
                  stealth_change: { type: "number" },
                  leadership_change: { type: "number" }
                }
              },
              recommended_promotion: { type: "boolean" },
              recommended_training: {
                type: "array",
                items: { type: "string" }
              }
            }
          }
        });

        const review = await base44.entities.CrewPerformanceReview.create({
          crew_member_id: member.id,
          crew_member_name: member.member_name,
          crew_id: crewId,
          review_period: 'week',
          ai_performance_analysis: analysis,
          assignments_completed: completed,
          assignments_failed: failed,
          loyalty_trend: member.loyalty > 70 ? 'increasing' : member.loyalty < 40 ? 'decreasing' : 'stable',
          recommended_promotion: analysis.recommended_promotion,
          recommended_training: analysis.recommended_training,
          visibility: 'crew_only'
        });

        reviews.push(review);
      }

      return reviews;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['performanceReviews']);
      toast.success('Performance reviews generated');
    },
    onError: () => {
      toast.error('Failed to generate reviews');
    }
  });

  if (!crewId || !playerData) return null;

  return (
    <Card className="glass-panel border-cyan-500/20">
      <CardHeader className="border-b border-cyan-500/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-cyan-400" />
            AI Performance Reviews
            <Badge className="ml-2 bg-cyan-600">{performanceReviews.length} Reviews</Badge>
          </CardTitle>
          <Button
            size="sm"
            onClick={() => generateReviewsMutation.mutate()}
            disabled={generateReviewsMutation.isPending || crewMembers.length === 0}
            className="bg-gradient-to-r from-cyan-600 to-blue-600"
          >
            {generateReviewsMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Zap className="w-4 h-4 mr-2" /> Generate Reviews</>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {performanceReviews.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No performance reviews yet</p>
            <p className="text-xs mt-1">Generate AI-driven reviews for your crew</p>
          </div>
        ) : (
          <div className="space-y-3">
            {performanceReviews.map((review) => {
              const TrendIcon = review.loyalty_trend === 'increasing' ? TrendingUp : 
                               review.loyalty_trend === 'decreasing' ? TrendingDown : Target;
              const trendColor = review.loyalty_trend === 'increasing' ? 'text-green-400' : 
                                review.loyalty_trend === 'decreasing' ? 'text-red-400' : 'text-gray-400';

              return (
                <div key={review.id} className="p-4 rounded-lg bg-slate-900/30 border border-cyan-500/10">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-white font-semibold">{review.crew_member_name}</h4>
                      <p className="text-xs text-gray-400 capitalize">Review Period: {review.review_period}</p>
                    </div>
                    <Badge className={
                      review.ai_performance_analysis?.overall_score >= 80 ? 'bg-green-600' :
                      review.ai_performance_analysis?.overall_score >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                    }>
                      Score: {review.ai_performance_analysis?.overall_score}/100
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                    <div>
                      <span className="text-gray-400">Completed:</span>
                      <span className="text-green-400 ml-2">{review.assignments_completed}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Failed:</span>
                      <span className="text-red-400 ml-2">{review.assignments_failed}</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <span className="text-gray-400">Loyalty:</span>
                      <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                      <span className={`text-sm capitalize ${trendColor}`}>{review.loyalty_trend}</span>
                    </div>
                  </div>

                  {review.ai_performance_analysis?.strengths && (
                    <div className="mb-3 p-2 rounded bg-green-900/20 border border-green-500/20">
                      <p className="text-xs text-green-400 font-semibold mb-1">💪 Strengths:</p>
                      {review.ai_performance_analysis.strengths.slice(0, 3).map((strength, idx) => (
                        <p key={idx} className="text-xs text-gray-300">• {strength}</p>
                      ))}
                    </div>
                  )}

                  {review.ai_performance_analysis?.weaknesses && (
                    <div className="mb-3 p-2 rounded bg-red-900/20 border border-red-500/20">
                      <p className="text-xs text-red-400 font-semibold mb-1">⚠️ Areas for Improvement:</p>
                      {review.ai_performance_analysis.weaknesses.slice(0, 2).map((weakness, idx) => (
                        <p key={idx} className="text-xs text-gray-300">• {weakness}</p>
                      ))}
                    </div>
                  )}

                  {review.recommended_training && review.recommended_training.length > 0 && (
                    <div className="p-2 rounded bg-blue-900/20 border border-blue-500/20">
                      <p className="text-xs text-blue-400 font-semibold mb-1">📚 Recommended Training:</p>
                      <div className="flex gap-1 flex-wrap">
                        {review.recommended_training.map((training, idx) => (
                          <Badge key={idx} className="text-xs bg-blue-600">{training}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {review.recommended_promotion && (
                    <div className="mt-2 p-2 rounded bg-yellow-900/20 border border-yellow-500/20">
                      <p className="text-xs text-yellow-400 font-semibold">🏆 Ready for Promotion</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}