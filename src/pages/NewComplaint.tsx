import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import brototypelogo from "@/assets/brototype-logo.jpg";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FixoBro } from "@/components/FixoBro";
import { detectDeviceInfo, type DeviceInfo } from "@/utils/deviceDetection";
import { AIAnalysisCard } from "@/components/AIAnalysisCard";
import { ScreenshotAnalysisCard } from "@/components/ScreenshotAnalysisCard";

const complaintSchema = z.object({
  category: z.enum(["Classroom", "Mentor", "Environment", "Misc"]),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(1000),
});

const NewComplaint = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Device info
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  
  // AI Analysis states
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [screenshotAnalysis, setScreenshotAnalysis] = useState<any>(null);
  const [isAnalyzingScreenshot, setIsAnalyzingScreenshot] = useState(false);

  // Detect device info on mount
  useEffect(() => {
    const detectDevice = async () => {
      const info = await detectDeviceInfo();
      setDeviceInfo(info);
      console.log('Device info detected:', info);
    };
    detectDevice();
  }, []);

  // Debounced AI analysis
  useEffect(() => {
    if (description.length < 20) {
      setAiAnalysis(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsAnalyzing(true);
      try {
        const { data, error } = await supabase.functions.invoke('fixobro', {
          body: {
            message: description,
            userId: user?.id,
            mode: 'analyze_complaint'
          }
        });

        if (error) throw error;
        if (data?.analysis) {
          setAiAnalysis(data.analysis);
          console.log('AI Analysis:', data.analysis);
        }
      } catch (error) {
        console.error('AI analysis error:', error);
      } finally {
        setIsAnalyzing(false);
      }
    }, 1500); // Analyze after 1.5s of no typing

    return () => clearTimeout(timeoutId);
  }, [description, user?.id]);

  // Screenshot analysis
  const analyzeScreenshot = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;

    setIsAnalyzingScreenshot(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      await new Promise((resolve, reject) => {
        reader.onload = resolve;
        reader.onerror = reject;
      });

      const base64 = (reader.result as string).split(',')[1];
      
      const { data, error } = await supabase.functions.invoke('analyze-screenshot', {
        body: {
          imageBase64: base64,
          imageMimeType: file.type
        }
      });

      if (error) throw error;
      if (data?.analysis) {
        setScreenshotAnalysis(data.analysis);
        console.log('Screenshot Analysis:', data.analysis);
        
        // Auto-append analysis to description
        if (data.analysis.rawAnalysis) {
          setDescription(prev => {
            const addition = `\n\n[Auto-Detected from Screenshot]\n${data.analysis.rawAnalysis}`;
            return prev + addition;
          });
        }
      }
    } catch (error) {
      console.error('Screenshot analysis error:', error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "Could not analyze screenshot, but you can still submit the complaint.",
      });
    } finally {
      setIsAnalyzingScreenshot(false);
    }
  }, [toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file size (5MB max)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: "Please select a file smaller than 5MB",
        });
        return;
      }

      // Validate file type
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Only images (JPG, PNG, WEBP) and PDF files are allowed",
        });
        return;
      }

      setFile(selectedFile);
      
      // Analyze screenshot if it's an image
      if (selectedFile.type.startsWith('image/')) {
        analyzeScreenshot(selectedFile);
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    setScreenshotAnalysis(null);
  };

  const handleAcceptCategory = () => {
    if (aiAnalysis?.category) {
      setCategory(aiAnalysis.category);
      toast({
        title: "Category Applied",
        description: `Set to ${aiAnalysis.category}`,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to submit a complaint",
      });
      navigate("/login");
      return;
    }

    setUploading(true);

    try {
      // Validate form data
      const validated = complaintSchema.parse({
        category,
        description,
      });

      // Ensure profile exists before submitting complaint
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!existingProfile) {
        // Create profile if it doesn't exist
        const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Student';
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            name: userName,
            student_id: user.user_metadata?.student_id || `STU-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
            course: user.user_metadata?.course || 'General',
            email: user.email,
          });

        if (profileError) {
          console.error("Profile creation error:", profileError);
          // Continue even if profile creation fails - complaint submission should still work
        }
      }

      let filePath: string | null = null;

      // Upload file if exists
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("complaint-files")
          .upload(fileName, file);

        if (uploadError) {
          throw new Error(`File upload failed: ${uploadError.message}`);
        }

        filePath = fileName;
      }

      // Insert complaint with AI data and device info
      const complaintData: any = {
        student_id: user.id,
        category: validated.category,
        description: validated.description,
        file_path: filePath,
        device_info: deviceInfo,
        ai_category_suggestion: aiAnalysis?.category,
        ai_root_cause: aiAnalysis?.rootCause,
        ai_severity: aiAnalysis?.severity,
        ai_tags: aiAnalysis?.tags,
        ai_confidence_score: aiAnalysis?.confidence,
        screenshot_analysis: screenshotAnalysis,
      };

      const { error: insertError } = await supabase
        .from("complaints")
        .insert(complaintData);

      if (insertError) {
        // If complaint insert fails, delete uploaded file
        if (filePath) {
          await supabase.storage.from("complaint-files").remove([filePath]);
        }
        throw new Error(insertError.message);
      }

      toast({
        title: "Complaint Submitted",
        description: "Your complaint has been successfully submitted and is pending review.",
      });

      navigate("/student/dashboard");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: error.errors[0].message,
        });
      } else if (error instanceof Error) {
        toast({
          variant: "destructive",
          title: "Submission Failed",
          description: error.message,
        });
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src={brototypelogo}
              alt="Brototype Logo"
              className="w-12 h-12 rounded-full object-contain"
            />
            <div>
              <h1 className="text-xl font-bold">New Complaint</h1>
              <p className="text-sm text-muted-foreground">Submit your issue</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="outline"
          onClick={() => navigate("/student/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Submit a Complaint</CardTitle>
            <CardDescription>
              Fill in the details below to submit your complaint. Our admin team will review it as
              soon as possible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* AI Analysis Card */}
              {isAnalyzing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>AI is analyzing your complaint...</span>
                </div>
              )}
              
              {aiAnalysis && (
                <AIAnalysisCard 
                  analysis={aiAnalysis} 
                  onAcceptCategory={handleAcceptCategory}
                />
              )}

              {/* Screenshot Analysis Card */}
              {isAnalyzingScreenshot && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analyzing screenshot...</span>
                </div>
              )}
              
              {screenshotAnalysis && (
                <ScreenshotAnalysisCard analysis={screenshotAnalysis} />
              )}

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Classroom">Classroom</SelectItem>
                    <SelectItem value="Mentor">Mentor</SelectItem>
                    <SelectItem value="Environment">Environment</SelectItem>
                    <SelectItem value="Misc">Miscellaneous</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Provide detailed information about your complaint..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={6}
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground">
                  {description.length}/1000 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Attachment (Optional)</Label>
                {!file ? (
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <Input
                      id="file"
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                    />
                    <label htmlFor="file" className="cursor-pointer">
                      <Upload className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium mb-1">Click to upload</p>
                      <p className="text-xs text-muted-foreground">
                        Images (JPG, PNG, WEBP) or PDF (Max 5MB)
                      </p>
                    </label>
                  </div>
                ) : (
                  <div className="border border-border rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Upload className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeFile}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1" disabled={uploading}>
                  {uploading ? "Submitting..." : "Submit Complaint"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/student/dashboard")}
                  disabled={uploading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      {/* Fixo Bro AI Assistant */}
      <FixoBro />
    </div>
  );
};

export default NewComplaint;
