/**
 * Error Boundary Component for Stryde
 * 
 * Catches JavaScript errors in child components and displays a fallback UI.
 * Implements accessibility features for screen reader support.
 */

import { DesignTokens } from '@/constants/theme';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button } from './button';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI with accessibility support
      return (
        <ThemedView style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            accessible={true}
            accessibilityRole="alert"
            accessibilityLabel="An error has occurred in the application"
          >
            <View style={styles.iconContainer}>
              <ThemedText variant="display" style={styles.icon}>
                ⚠️
              </ThemedText>
            </View>

            <ThemedText
              variant="h1"
              style={styles.title}
              accessibilityRole="header"
            >
              Something Went Wrong
            </ThemedText>

            <ThemedText
              variant="body"
              color="secondary"
              style={styles.description}
            >
              We&apos;re sorry, but something unexpected happened. Please try again or contact support if the problem persists.
            </ThemedText>

            {__DEV__ ? (
              this.state.error ? (
                <View
                  style={styles.errorDetails}
                  accessible={true}
                  accessibilityLabel="Error details for debugging"
                >
                  <ThemedText
                    variant="bodyBold"
                    color="secondary"
                    style={styles.errorTitle}
                  >
                    Error Details (Development Only):
                  </ThemedText>
                  <ThemedText
                    variant="caption"
                    color="secondary"
                    style={styles.errorMessage}
                  >
                    {this.state.error.toString()}
                  </ThemedText>
                  {this.state.errorInfo ? (
                    <ThemedText
                      variant="micro"
                      color="secondary"
                      style={styles.stackTrace}
                    >
                      {this.state.errorInfo.componentStack}
                    </ThemedText>
                  ) : null}
                </View>
              ) : null
            ) : null}

            <View style={styles.buttonContainer}>
              <Button
                title="Try Again"
                onPress={this.handleReset}
                accessibilityLabel="Try loading the content again"
                accessibilityHint="Double tap to retry loading the screen"
              />
            </View>
          </ScrollView>
        </ThemedView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignTokens.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 300,
  },
  errorDetails: {
    backgroundColor: DesignTokens.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: DesignTokens.error,
  },
  errorTitle: {
    marginBottom: 8,
    color: DesignTokens.error,
  },
  errorMessage: {
    marginBottom: 8,
  },
  stackTrace: {
    fontFamily: 'monospace',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
});

/**
 * HOC to wrap components with ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
