"use client";

import { enhancedAuthClient } from "auth/client";
import { authClient } from "auth/client";
import { useEffect, useState, Suspense, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "ui/card";
import { Badge } from "ui/badge";
import { Crown, CreditCard } from "lucide-react";
import { Skeleton } from "ui/skeleton";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

type Order = {
  id: string;
  amount: number;
  currency: string;
  productId: string;
  createdAt: string;
  status: string;
  product?: {
    id: string;
    name: string;
    description: string;
  };
};

type UserTier = "free" | "lifetime";

/**
 * Loading skeleton for dashboard content
 */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Hook to fetch lifetime orders and determine user tier
 */
function useCustomerState() {
  const [lifetimeOrders, setLifetimeOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userTier, setUserTier] = useState<UserTier>("free");
  const { data: session } = authClient.useSession();
  const fetchInitiated = useRef(false);

  const fetchLifetimeOrders = async () => {
    try {
      setIsLoading(true);

      // Fetch lifetime orders with automatic fallback
      let newLifetimeOrders: any[] = [];
      try {
        const ordersResult = await enhancedAuthClient.customer.orders.list({
          query: {
            page: 1,
            limit: 10,
            productBillingType: "one_time",
          },
        });

        const rawOrders = ordersResult?.data?.result?.items || [];
        if (rawOrders.length > 0) {
          // Map to our Order type structure
          const mappedOrders: Order[] = rawOrders.map((order: any) => ({
            id: order.id,
            amount: order.amount,
            currency: order.currency,
            productId: order.productId,
            createdAt: order.createdAt,
            status: order.status,
            product: order.product
              ? {
                  id: order.product.id,
                  name: order.product.name,
                  description: order.product.description,
                }
              : undefined,
          }));

          setLifetimeOrders(mappedOrders);
          newLifetimeOrders = rawOrders;
        } else {
          setLifetimeOrders([]);
        }
      } catch (_error) {
        setLifetimeOrders([]);
      }

      // Determine user tier based on lifetime orders
      if (newLifetimeOrders.length > 0) {
        setUserTier("lifetime");
      } else {
        setUserTier("free");
      }
    } catch (_error: any) {
      setLifetimeOrders([]);
      setUserTier("free");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch lifetime orders on mount and when session changes
  useEffect(() => {
    if (session?.user && !fetchInitiated.current) {
      fetchInitiated.current = true;
      fetchLifetimeOrders();
    }
  }, [session]);

  return {
    lifetimeOrders,
    isLoading,
    userTier,
    refetch: fetchLifetimeOrders,
  };
}

/**
 * Dashboard content component that handles the data fetching
 */
function DashboardContent() {
  const { lifetimeOrders, isLoading, userTier, refetch } = useCustomerState();
  const { data: session } = authClient.useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Handle successful checkout
  useEffect(() => {
    const checkoutSuccess = searchParams.get("checkout_success");
    const checkoutId = searchParams.get("checkout_id");

    if (checkoutSuccess === "true" && checkoutId && session?.user) {
      // Show success message
      toast.success("🎉 Payment successful! Welcome to lifetime access!");

      // Refetch lifetime orders after a short delay to ensure Polar has processed the payment
      setTimeout(() => {
        refetch();
      }, 2000);

      // Clean up URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout_success");
      url.searchParams.delete("checkout_id");
      url.searchParams.delete("customer_session_token");
      router.replace(url.pathname);
    }
  }, [searchParams, session, router, refetch]);

  /**
   * Determines the user's subscription tier
   */
  const getUserTier = (): UserTier => {
    return userTier;
  };

  /**
   * Returns a personalized welcome message based on user tier
   */
  const getWelcomeMessage = () => {
    const tier = getUserTier();
    const tierMessages = {
      free: "Welcome to your dashboard! Upgrade to unlock unlimited features.",
      lifetime:
        "Welcome back, Lifetime Member! You have access to everything, forever.",
    };
    return tierMessages[tier];
  };

  /**
   * Returns tier-specific content and features
   */
  const getTierSpecificContent = () => {
    const tier = getUserTier();

    const tierContent = {
      free: {
        title: "Free Plan",
        icon: <CreditCard className="h-5 w-5 text-muted-foreground" />,
        badge: { text: "Free", variant: "secondary" as const },
        features: [
          { name: "Lead Magnet Forms", enabled: true, limit: "5 forms max" },
          { name: "Analytics Events", enabled: true, limit: "Basic tracking" },
          { name: "Tracking History", enabled: true, limit: "30 days" },
          { name: "Time Tracking", enabled: false, limit: "Not included" },
          { name: "Project Dashboards", enabled: true, limit: "1 dashboard" },
          { name: "Link Variations", enabled: false, limit: "Not included" },
          { name: "Subscribers", enabled: true, limit: "Basic management" },
          { name: "Premium Features", enabled: false, limit: "Locked" },
        ],
        description:
          "Perfect for getting started with basic lead generation features.",
        upgradeMessage:
          "Upgrade to lifetime for unlimited everything and premium features!",
      },
      lifetime: {
        title: "Lifetime Access",
        icon: <Crown className="h-5 w-5 text-accent-foreground" />,
        badge: { text: "Lifetime", variant: "default" as const },
        features: [
          { name: "Lead Magnet Forms", enabled: true, limit: "Unlimited" },
          {
            name: "Analytics Events",
            enabled: true,
            limit: "Unlimited tracking",
          },
          { name: "Tracking History", enabled: true, limit: "Forever" },
          { name: "Time Tracking", enabled: true, limit: "Unlimited" },
          { name: "Project Dashboards", enabled: true, limit: "Unlimited" },
          { name: "Link Variations", enabled: true, limit: "Unlimited" },
          { name: "Subscribers", enabled: true, limit: "Unlimited" },
          { name: "Email Templates", enabled: true, limit: "Full automation" },
          { name: "Priority Support", enabled: true, limit: "Dedicated line" },
          {
            name: "Lifetime Updates",
            enabled: true,
            limit: "Forever included",
          },
        ],
        description:
          "The ultimate package with unlimited everything, forever. Perfect for serious lead generation.",
        upgradeMessage:
          "You have lifetime access to everything! Enjoy all premium features forever.",
      },
    };

    return tierContent[tier];
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const tierContent = getTierSpecificContent();
  const tier = getUserTier();

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <Badge
            variant={tierContent.badge.variant}
            className="flex items-center gap-1"
          >
            {tierContent.icon}
            {tierContent.badge.text}
          </Badge>
        </div>
        <p className="text-muted-foreground">{getWelcomeMessage()}</p>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {/* Subscription Status Card */}
        <Card className="col-span-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {tierContent.icon}
                <CardTitle>{tierContent.title}</CardTitle>
              </div>
              <Badge variant={tierContent.badge.variant}>
                {tierContent.badge.text}
              </Badge>
            </div>
            <CardDescription>{tierContent.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Features Grid */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tierContent.features.map((feature) => (
                  <div
                    key={feature.name}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      feature.enabled
                        ? "bg-muted/50 border-border"
                        : "bg-muted/20 border-border"
                    }`}
                  >
                    <div className="space-y-1">
                      <p
                        className={`text-sm font-medium ${
                          feature.enabled
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {feature.name}
                      </p>
                      <p
                        className={`text-xs ${
                          feature.enabled
                            ? "text-muted-foreground"
                            : "text-muted-foreground/70"
                        }`}
                      >
                        {feature.limit}
                      </p>
                    </div>
                    <div
                      className={`w-2 h-2 rounded-full ${
                        feature.enabled
                          ? "bg-primary"
                          : "bg-muted-foreground/50"
                      }`}
                    />
                  </div>
                ))}
              </div>

              {/* Upgrade Message */}
              {tier !== "lifetime" && (
                <div className="mt-6 p-4 bg-accent/10 border border-accent/20 rounded-lg">
                  <p className="text-sm text-accent-foreground">
                    💡 {tierContent.upgradeMessage}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lifetime Purchases */}
        {lifetimeOrders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Lifetime Access</CardTitle>
              <CardDescription>Your lifetime purchases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lifetimeOrders.map((order) => (
                  <div key={order.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Purchase</span>
                      <span className="text-sm">
                        ${(order.amount / 100).toFixed(2)}{" "}
                        {order.currency.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Date</span>
                      <span className="text-sm">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Status</span>
                      <Badge variant="default">
                        <Crown className="w-3 h-3 mr-1" />
                        Lifetime Access
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <button className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent/10 transition-colors">
                <div className="font-medium text-sm text-foreground">
                  Create Lead Magnet
                </div>
                <div className="text-xs text-muted-foreground">
                  {tier === "free" ? "5 forms available" : "Unlimited forms"}
                </div>
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent/10 transition-colors">
                <div className="font-medium text-sm text-foreground">
                  View Analytics
                </div>
                <div className="text-xs text-muted-foreground">
                  {tier === "free" ? "Basic tracking" : "Unlimited events"}
                </div>
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent/10 transition-colors">
                <div className="font-medium text-sm text-foreground">
                  Manage Projects
                </div>
                <div className="text-xs text-muted-foreground">
                  {tier === "free" ? "1 dashboard" : "Unlimited dashboards"}
                </div>
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent/10 transition-colors">
                <div className="font-medium text-sm text-foreground">
                  Contact Support
                </div>
                <div className="text-xs text-muted-foreground">
                  {tier === "free" ? "Community support" : "Priority support"}
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Main dashboard page component with suspense wrapper
 */
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
