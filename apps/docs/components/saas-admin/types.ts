export type CustomerStatus = 'active' | 'trial' | 'paused';
export type DemoRole = 'owner' | 'admin' | 'member' | 'viewer';
export type DemoPlan = 'starter' | 'team' | 'business';
export type AdminPage = 'overview' | 'customers' | 'members' | 'settings' | 'billing';
export interface CustomerDraft {
  name: string;
  email: string;
  company: string;
  status: CustomerStatus;
  notes: string;
}
export interface Customer extends Readonly<CustomerDraft> {
  readonly id: string;
  readonly version: number;
  readonly created: string;
}
export interface Member {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: DemoRole;
  readonly version: number;
}
export interface OrganizationSettings {
  readonly name: string;
  readonly email: string;
  readonly weeklyDigest: boolean;
  readonly version: number;
}
export interface DemoBilling {
  readonly plan: DemoPlan;
  readonly seats: number;
  readonly version: number;
}
export interface DemoOrganization {
  readonly id: string;
  readonly settings: OrganizationSettings;
  readonly customers: readonly Customer[];
  readonly members: readonly Member[];
  readonly billing: DemoBilling;
}
export interface AdminSnapshot {
  readonly version: number;
  readonly organizations: readonly DemoOrganization[];
}
export interface AdminLocation {
  organizationId: string;
  page: AdminPage;
  customerId?: string;
  editing?: boolean;
  creating?: boolean;
}
export type FieldErrors = Partial<Record<keyof CustomerDraft | 'seats' | 'role', string>>;
interface CommandScope {
  readonly id: string;
  readonly organizationId: string;
}
export type AdminCommand = CommandScope &
  (
    | { readonly kind: 'create-customer'; readonly draft: CustomerDraft }
    | { readonly kind: 'delete-customer'; readonly customerId: string; readonly version: number }
    | {
        readonly kind: 'edit-customer';
        readonly customerId: string;
        readonly version: number;
        readonly draft: CustomerDraft;
      }
    | {
        readonly kind: 'change-role';
        readonly memberId: string;
        readonly version: number;
        readonly role: DemoRole;
      }
    | {
        readonly kind: 'save-settings';
        readonly version: number;
        readonly draft: Omit<OrganizationSettings, 'version'>;
      }
    | {
        readonly kind: 'save-billing';
        readonly version: number;
        readonly draft: Omit<DemoBilling, 'version'>;
      }
  );
export type AdminReceipt =
  | {
      readonly status: 'acknowledged';
      readonly command: AdminCommand;
      readonly snapshot: AdminSnapshot;
      readonly message: string;
      readonly customerId?: string;
    }
  | {
      readonly status: 'rejected';
      readonly command: AdminCommand;
      readonly message: string;
      readonly errors?: FieldErrors;
    };
export type SubmissionResult =
  | AdminReceipt
  | { readonly status: 'unknown'; readonly command: AdminCommand; readonly message: string };
export type DemoFailureMode = 'none' | 'reject' | 'lose-receipt';
export interface SaaSAdminHost {
  read(): AdminSnapshot;
  submit(command: AdminCommand, mode?: DemoFailureMode): Promise<SubmissionResult>;
  /** Retrieve the original result; does not execute the command again. */
  receipt(command: AdminCommand): Promise<AdminReceipt | undefined>;
}
