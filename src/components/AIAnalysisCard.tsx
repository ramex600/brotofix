import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, AlertTriangle, Sparkles } from "lucide-react";

interface AIAnalysisCardProps {
  analysis: {
    category?: string;
    rootCause?: string;
    severity?: string;
    tags?: string[];
    confidence?: number;
    suggestedFixes?: string[];
  };
  onAcceptCategory?: () => void;
}

export const AIAnalysisCard = ({ analysis, onAcceptCategory }: AIAnalysisCardProps) => {
  if (!analysis.category) return null;

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const confidencePercent = Math.round((analysis.confidence || 0) * 100);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Analysis
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {confidencePercent}% confident
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Category Suggestion */}
        {analysis.category && (
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Suggested Category</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{analysis.category}</Badge>
                {onAcceptCategory && (
                  <button
                    onClick={onAcceptCategory}
                    className="text-xs text-primary hover:underline"
                  >
                    Accept
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Root Cause */}
        {analysis.rootCause && (
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Root Cause</p>
              <p className="text-sm mt-1">{analysis.rootCause}</p>
            </div>
          </div>
        )}

        {/* Severity */}
        {analysis.severity && (
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">Severity:</p>
            <Badge className={getSeverityColor(analysis.severity)}>
              {analysis.severity}
            </Badge>
          </div>
        )}

        {/* Tags */}
        {analysis.tags && analysis.tags.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Tags</p>
            <div className="flex flex-wrap gap-1">
              {analysis.tags.map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Fixes */}
        {analysis.suggestedFixes && analysis.suggestedFixes.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Suggested Solutions</p>
            <ul className="text-sm space-y-1">
              {analysis.suggestedFixes.map((fix, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{fix}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
