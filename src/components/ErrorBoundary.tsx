import React, { Component, ErrorInfo, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    
    // Log error to Supabase
    this.logErrorToSupabase(error, errorInfo);
  }

  private async logErrorToSupabase(error: Error, errorInfo: ErrorInfo) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from("app_errors").insert({
        user_id: user?.id || null,
        error_message: error.message,
        error_stack: error.stack || null,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        metadata: {
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error("Failed to log error to Supabase:", err);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive mb-2">
                <AlertTriangle className="h-6 w-6" />
                <CardTitle>Algo deu errado</CardTitle>
              </div>
              <CardDescription>
                Ocorreu um erro inesperado. Nossa equipe foi notificada e estamos trabalhando para resolver.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <details className="text-sm text-muted-foreground">
                <summary className="cursor-pointer mb-2 font-medium">Detalhes técnicos</summary>
                <pre className="p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                  {this.state.error?.message}
                </pre>
              </details>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={this.handleReload} variant="default" className="flex-1">
                Recarregar página
              </Button>
              <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                Ir para início
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
