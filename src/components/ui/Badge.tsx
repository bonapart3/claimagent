import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils/cn"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-success/10 text-success hover:bg-success/20",
        warning:
          "border-transparent bg-warning/10 text-warning hover:bg-warning/20",
        info:
          "border-transparent bg-primary/10 text-primary hover:bg-primary/20",
        error:
          "border-transparent bg-destructive/10 text-destructive hover:bg-destructive/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

// Status-specific badge component for claims
type ClaimStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'INVESTIGATING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID'
  | 'FLAGGED_FRAUD'
  | 'CLOSED';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'error';

const statusVariants: Record<ClaimStatus, BadgeVariant> = {
  SUBMITTED: 'info',
  UNDER_REVIEW: 'warning',
  INVESTIGATING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  PAID: 'success',
  FLAGGED_FRAUD: 'error',
  CLOSED: 'secondary',
};

interface StatusBadgeProps {
  status: ClaimStatus;
  className?: string;
}

function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = statusVariants[status] || 'default';
  const displayStatus = status.replace(/_/g, ' ');

  return (
    <Badge variant={variant} className={className}>
      {displayStatus}
    </Badge>
  );
}

export { Badge, badgeVariants, StatusBadge }
