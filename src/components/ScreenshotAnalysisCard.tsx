import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, FileText, Wrench, AlertCircle } from "lucide-react";

interface ScreenshotAnalysis {
  rawAnalysis?: string;
  detectedText?: string;
  errorMessages?: string;
  problemType?: string;
  suggestedFixes?: string[];
  severity?: string;
  confidence?: number;
}

interface ScreenshotAnalysisCardProps {
  analysis: ScreenshotAnalysis;
}

export const ScreenshotAnalysisCard = ({ analysis }: ScreenshotAnalysisCardProps) => {
  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="border-blue-500/20 bg-blue-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Eye className="h-4 w-4 text-blue-500" />
            Screenshot Analysis
          </CardTitle>
          {analysis.severity && (
            <Badge className={getSeverityColor(analysis.severity)}>
              {analysis.severity}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* Problem Type */}
        {analysis.problemType && (
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Problem Type</p>
              <Badge variant="secondary" className="mt-1">
                {analysis.problemType}
              </Badge>
            </div>
          </div>
        )}

        {/* Detected Text */}
        {analysis.detectedText && analysis.detectedText !== 'No specific details detected' && (
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Detected Text</p>
              <div className="text-sm bg-muted/50 p-2 rounded border">
                <pre className="whitespace-pre-wrap break-words font-mono text-xs">
                  {analysis.detectedText}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Error Messages */}
        {analysis.errorMessages && analysis.errorMessages !== 'No specific details detected' && (
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Error Messages</p>
              <div className="text-sm bg-orange-500/10 p-2 rounded border border-orange-500/20">
                {analysis.errorMessages}
              </div>
            </div>
          </div>
        )}

        {/* Suggested Fixes */}
        {analysis.suggestedFixes && analysis.suggestedFixes.length > 0 && (
          <div className="flex items-start gap-2">
            <Wrench className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-2">Suggested Fixes</p>
              <ul className="space-y-1.5">
                {analysis.suggestedFixes.map((fix, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-green-500 font-bold mt-0.5">{idx + 1}.</span>
                    <span>{fix}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Raw Analysis (collapsible) */}
        {analysis.rawAnalysis && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              View full analysis
            </summary>
            <div className="mt-2 p-2 bg-muted/30 rounded border text-xs whitespace-pre-wrap">
              {analysis.rawAnalysis}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
};
