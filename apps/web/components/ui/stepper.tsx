import * as React from "react"
import { cn } from "@/lib/utils"

interface StepperProps {
  steps: string[]
  currentStep: number
}

export function Stepper({ steps, currentStep }: StepperProps) {
  const progress =
    steps.length > 1 ? ((Math.max(currentStep, 1) - 1) / (steps.length - 1)) * 100 : 0

  return (
    <div className="relative mb-8 px-2">
      <div className="absolute left-7 right-7 top-5 h-px bg-border" />
      <div
        className="absolute left-7 top-5 h-px bg-primary-600 transition-[width] duration-300"
        style={{ width: `calc((100% - 3.5rem) * ${progress / 100})` }}
      />

      <div className="grid grid-cols-4 gap-2">
      {steps.map((step, index) => {
        const stepNumber = index + 1
        const isActive = currentStep === stepNumber
        const isCompleted = currentStep > stepNumber

        return (
          <div
            key={step}
            className="relative z-10 flex min-w-0 flex-col items-center text-center"
          >
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors bg-background",
                isActive && "border-primary-600 bg-primary-600 text-primary-foreground",
                isCompleted && "border-primary-600 bg-background text-primary-600",
                !isActive && !isCompleted && "border-muted-foreground text-muted-foreground"
              )}
            >
              {stepNumber}
            </div>

            <span
              className={cn(
                "mt-4 text-xs font-medium leading-5 sm:text-sm",
                isActive || isCompleted ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step}
            </span>
          </div>
        )
      })}
      </div>
    </div>
  )
}
