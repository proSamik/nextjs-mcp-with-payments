"use client";
import React from "react";
import { HeroParallax } from "./ui/hero-parallax";
import { HoverBorderGradient } from "./ui/hover-border-gradient";
import { IconSparkles, IconRocket, IconFlame } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export function HeroSection() {
  const products = [
    {
      title: "Lead Capture Dashboard",
      link: "#",
      thumbnail:
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop&crop=entropy&auto=format",
    },
    {
      title: "Email Analytics",
      link: "#",
      thumbnail:
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop&crop=entropy&auto=format",
    },
    {
      title: "Traffic Tracking",
      link: "#",
      thumbnail:
        "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=600&fit=crop&crop=entropy&auto=format",
    },
    {
      title: "Social Media Integration",
      link: "#",
      thumbnail:
        "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=600&fit=crop&crop=entropy&auto=format",
    },
    {
      title: "Email Templates",
      link: "#",
      thumbnail:
        "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&h=600&fit=crop&crop=entropy&auto=format",
    },
    {
      title: "Conversion Funnel",
      link: "#",
      thumbnail:
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop&crop=entropy&auto=format",
    },
    {
      title: "Lead Magnets",
      link: "#",
      thumbnail:
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop&crop=entropy&auto=format",
    },
    {
      title: "YouTube Integration",
      link: "#",
      thumbnail:
        "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=600&fit=crop&crop=entropy&auto=format",
    },
    {
      title: "Instagram Analytics",
      link: "#",
      thumbnail:
        "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=600&fit=crop&crop=entropy&auto=format",
    },
    {
      title: "Landing Page Builder",
      link: "#",
      thumbnail:
        "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&h=600&fit=crop&crop=entropy&auto=format",
    },
  ];

  return (
    <section id="home" className="relative bg-background">
      <HeroParallax products={products}>
        <div className="relative z-10 w-full min-h-[90vh] mx-auto px-4 bg-white-100 rounded-md bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-20 mx-auto p-4">
          <div className="text-center space-y-8">
            <h1 className="text-4xl md:text-7xl font-bold text-foreground leading-tight tracking-tighter">
              Grow Your Audience Today,{" "}
              <span
                className={cn(
                  "bg-gradient-to-b from-primary/80 to-primary",
                  "text-transparent bg-clip-text",
                )}
              >
                Scale Later
              </span>
            </h1>
            <div className="">
              <p className="max-w-3xl mx-auto text-lg md:text-xl leading-relaxed">
                A one-time purchase tool that automates <br />
                <span className="font-semibold text-foreground">
                  lead capture
                </span>
                ,{" "}
                <span className="font-semibold text-foreground">
                  email follow-ups
                </span>
                , and{" "}
                <span className="font-semibold text-foreground">
                  traffic tracking
                  <br />
                </span>
                with no monthly fees, no vendor lock-in, and your first 1,000
                emails are{" "}
                <span className="font-bold text-amber-500">FREE</span>{" "}
                <IconSparkles className="inline-block h-5 w-5 text-amber-500" />
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-8">
              <HoverBorderGradient
                containerClassName="rounded-full"
                as="button"
                className="bg-primary text-primary-foreground flex items-center space-x-2 px-8 py-4 text-lg font-semibold hover:scale-105 transition-transform"
              >
                <IconRocket className="h-5 w-5" />
                <span>Get Started — It&apos;s Free</span>
              </HoverBorderGradient>
              <HoverBorderGradient
                containerClassName="rounded-full"
                as="button"
                className="bg-background text-foreground border-2 border-border flex items-center space-x-2 px-8 py-4 text-lg font-semibold hover:scale-105 transition-transform"
              >
                <IconSparkles className="h-5 w-5" />
                <span>See How It Works</span>
              </HoverBorderGradient>
            </div>
            <div className="pt-8">
              <p className="text-sm text-primary font-medium flex items-center justify-center">
                <IconFlame className="h-5 w-5 text-red-500 mr-2" />
                Join 10,000+ creators who&apos;ve ditched monthly subscriptions
              </p>
            </div>
          </div>
        </div>
      </HeroParallax>
    </section>
  );
}
