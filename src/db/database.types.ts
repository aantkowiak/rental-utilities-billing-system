export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  graphql_public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      reading_type: "regular" | "overwrite";
    };
    CompositeTypes: Record<never, never>;
  };
  public: {
    Tables: {
      contracts: {
        Row: {
          created_at: string;
          id: string;
          period: unknown;
          property_id: string;
          tenant_user_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          period: unknown;
          property_id: string;
          tenant_user_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          period?: unknown;
          property_id?: string;
          tenant_user_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contracts_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      monthly_advances: {
        Row: {
          advance_payment: number;
          created_at: string;
          forecast_cold: number;
          forecast_heating: number;
          forecast_hot: number;
          id: string;
          manager_fee: number;
          month: string;
          price_cold: number;
          price_heating: number;
          price_hot_heating: number;
          property_id: string;
          updated_at: string;
        };
        Insert: {
          advance_payment: number;
          created_at?: string;
          forecast_cold: number;
          forecast_heating: number;
          forecast_hot: number;
          id?: string;
          manager_fee: number;
          month: string;
          price_cold: number;
          price_heating: number;
          price_hot_heating: number;
          property_id: string;
          updated_at?: string;
        };
        Update: {
          advance_payment?: number;
          created_at?: string;
          forecast_cold?: number;
          forecast_heating?: number;
          forecast_hot?: number;
          id?: string;
          manager_fee?: number;
          month?: string;
          price_cold?: number;
          price_heating?: number;
          price_hot_heating?: number;
          property_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "monthly_advances_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          property_id: string | null;
          role: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          property_id?: string | null;
          role: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          property_id?: string | null;
          role?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      properties: {
        Row: {
          created_at: string;
          id: string;
          label: string;
          start_month: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          label: string;
          start_month: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string;
          start_month?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      readings: {
        Row: {
          base_for_month: string | null;
          cold_m3: number;
          cold_replaced: boolean;
          comment_text: string | null;
          comment_visible_to_tenant: boolean;
          created_at: string;
          deleted_at: string | null;
          effective_month: string | null;
          final_for_month: string | null;
          heating_gj: number;
          heating_replaced: boolean;
          hot_m3: number;
          hot_replaced: boolean;
          id: string;
          origin: string;
          property_id: string;
          reading_at: string;
          reading_type: Database["public"]["Enums"]["reading_type"];
          updated_at: string;
        };
        Insert: {
          base_for_month?: string | null;
          cold_m3: number;
          cold_replaced?: boolean;
          comment_text?: string | null;
          comment_visible_to_tenant?: boolean;
          created_at?: string;
          deleted_at?: string | null;
          effective_month?: string | null;
          final_for_month?: string | null;
          heating_gj: number;
          heating_replaced?: boolean;
          hot_m3: number;
          hot_replaced?: boolean;
          id?: string;
          origin: string;
          property_id: string;
          reading_at: string;
          reading_type: Database["public"]["Enums"]["reading_type"];
          updated_at?: string;
        };
        Update: {
          base_for_month?: string | null;
          cold_m3?: number;
          cold_replaced?: boolean;
          comment_text?: string | null;
          comment_visible_to_tenant?: boolean;
          created_at?: string;
          deleted_at?: string | null;
          effective_month?: string | null;
          final_for_month?: string | null;
          heating_gj?: number;
          heating_replaced?: boolean;
          hot_m3?: number;
          hot_replaced?: boolean;
          id?: string;
          origin?: string;
          property_id?: string;
          reading_at?: string;
          reading_type?: Database["public"]["Enums"]["reading_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "readings_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      report_email_attempts: {
        Row: {
          attempted_at: string;
          error_message: string | null;
          id: string;
          report_email_id: string;
          status: string;
        };
        Insert: {
          attempted_at?: string;
          error_message?: string | null;
          id?: string;
          report_email_id: string;
          status: string;
        };
        Update: {
          attempted_at?: string;
          error_message?: string | null;
          id?: string;
          report_email_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "report_email_attempts_report_email_id_fkey";
            columns: ["report_email_id"];
            isOneToOne: false;
            referencedRelation: "report_emails";
            referencedColumns: ["id"];
          },
        ];
      };
      report_emails: {
        Row: {
          created_at: string;
          id: string;
          last_sent_at: string | null;
          recipient_email: string;
          report_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          last_sent_at?: string | null;
          recipient_email: string;
          report_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_sent_at?: string | null;
          recipient_email?: string;
          report_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "report_emails_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "reports";
            referencedColumns: ["id"];
          },
        ];
      };
      report_items: {
        Row: {
          amount_raw: number;
          baseline_reading_id: string;
          cost_cold_raw: number;
          cost_heating_raw: number;
          cost_hot_raw: number;
          created_at: string;
          final_reading_id: string;
          fixed_cost_raw: number;
          id: string;
          property_id: string;
          report_id: string;
          updated_at: string;
          usage_cold_m3: number;
          usage_heating_gj: number;
          usage_hot_m3: number;
        };
        Insert: {
          amount_raw: number;
          baseline_reading_id: string;
          cost_cold_raw: number;
          cost_heating_raw: number;
          cost_hot_raw: number;
          created_at?: string;
          final_reading_id: string;
          fixed_cost_raw: number;
          id?: string;
          property_id: string;
          report_id: string;
          updated_at?: string;
          usage_cold_m3: number;
          usage_heating_gj: number;
          usage_hot_m3: number;
        };
        Update: {
          amount_raw?: number;
          baseline_reading_id?: string;
          cost_cold_raw?: number;
          cost_heating_raw?: number;
          cost_hot_raw?: number;
          created_at?: string;
          final_reading_id?: string;
          fixed_cost_raw?: number;
          id?: string;
          property_id?: string;
          report_id?: string;
          updated_at?: string;
          usage_cold_m3?: number;
          usage_heating_gj?: number;
          usage_hot_m3?: number;
        };
        Relationships: [
          {
            foreignKeyName: "report_items_baseline_reading_id_fkey";
            columns: ["baseline_reading_id"];
            isOneToOne: false;
            referencedRelation: "readings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "report_items_final_reading_id_fkey";
            columns: ["final_reading_id"];
            isOneToOne: false;
            referencedRelation: "readings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "report_items_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "report_items_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "reports";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          contract_id: string;
          created_at: string;
          id: string;
          month: string;
          property_id: string;
          realized_at: string | null;
          sent: boolean;
          status: string;
          updated_at: string;
        };
        Insert: {
          contract_id: string;
          created_at?: string;
          id?: string;
          month: string;
          property_id: string;
          realized_at?: string | null;
          sent?: boolean;
          status: string;
          updated_at?: string;
        };
        Update: {
          contract_id?: string;
          created_at?: string;
          id?: string;
          month?: string;
          property_id?: string;
          realized_at?: string | null;
          sent?: boolean;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_contract_id_fkey";
            columns: ["contract_id"];
            isOneToOne: false;
            referencedRelation: "contracts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: {
      current_property_ids: { Args: never; Returns: string[] };
      is_admin: { Args: never; Returns: boolean };
      is_tenant: { Args: never; Returns: boolean };
      list_profiles_with_emails: {
        Args: never;
        Returns: {
          created_at: string;
          display_name: string;
          email: string;
          property_id: string;
          role: string;
          updated_at: string;
          user_id: string;
        }[];
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
