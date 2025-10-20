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
    Enums: Record<never, never>;
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
      monthly_conditions: {
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
            foreignKeyName: "monthly_conditions_property_id_fkey";
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
          cold_m3: number;
          cold_replaced: boolean;
          comment_text: string | null;
          comment_visible_to_tenant: boolean;
          created_at: string;
          deleted_at: string | null;
          effective_month: string | null;
          heating_gj: number;
          heating_replaced: boolean;
          hot_m3: number;
          hot_replaced: boolean;
          id: string;
          origin: string;
          property_id: string;
          reading_at: string;
          reading_type: string;
          updated_at: string;
        };
        Insert: {
          cold_m3: number;
          cold_replaced?: boolean;
          comment_text?: string | null;
          comment_visible_to_tenant?: boolean;
          created_at?: string;
          deleted_at?: string | null;
          effective_month?: string | null;
          heating_gj: number;
          heating_replaced?: boolean;
          hot_m3: number;
          hot_replaced?: boolean;
          id?: string;
          origin: string;
          property_id: string;
          reading_at: string;
          reading_type: string;
          updated_at?: string;
        };
        Update: {
          cold_m3?: number;
          cold_replaced?: boolean;
          comment_text?: string | null;
          comment_visible_to_tenant?: boolean;
          created_at?: string;
          deleted_at?: string | null;
          effective_month?: string | null;
          heating_gj?: number;
          heating_replaced?: boolean;
          hot_m3?: number;
          hot_replaced?: boolean;
          id?: string;
          origin?: string;
          property_id?: string;
          reading_at?: string;
          reading_type?: string;
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
      reports: {
        Row: {
          actual_rent_raw: number;
          anchor_reading_id: string;
          anchor_reading_next_id: string;
          balance_raw: number;
          contract_id: string;
          created_at: string;
          fixed_cost_raw: number;
          id: string;
          meter_cost_cold_raw: number;
          meter_cost_heating_raw: number;
          meter_cost_hot_raw: number;
          month: string;
          monthly_conditions_id: string;
          realized_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          actual_rent_raw: number;
          anchor_reading_id: string;
          anchor_reading_next_id: string;
          balance_raw: number;
          contract_id: string;
          created_at?: string;
          fixed_cost_raw: number;
          id?: string;
          meter_cost_cold_raw: number;
          meter_cost_heating_raw: number;
          meter_cost_hot_raw: number;
          month: string;
          monthly_conditions_id: string;
          realized_at?: string | null;
          status: string;
          updated_at?: string;
        };
        Update: {
          actual_rent_raw?: number;
          anchor_reading_id?: string;
          anchor_reading_next_id?: string;
          balance_raw?: number;
          contract_id?: string;
          created_at?: string;
          fixed_cost_raw?: number;
          id?: string;
          meter_cost_cold_raw?: number;
          meter_cost_heating_raw?: number;
          meter_cost_hot_raw?: number;
          month?: string;
          monthly_conditions_id?: string;
          realized_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_anchor_reading_id_fkey";
            columns: ["anchor_reading_id"];
            isOneToOne: false;
            referencedRelation: "readings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_anchor_reading_next_id_fkey";
            columns: ["anchor_reading_next_id"];
            isOneToOne: false;
            referencedRelation: "readings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_contract_id_fkey";
            columns: ["contract_id"];
            isOneToOne: false;
            referencedRelation: "contracts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_monthly_conditions_id_fkey";
            columns: ["monthly_conditions_id"];
            isOneToOne: false;
            referencedRelation: "monthly_conditions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: {
      citext: {
        Args: { "": boolean } | { "": string } | { "": unknown };
        Returns: string;
      };
      citext_hash: {
        Args: { "": string };
        Returns: number;
      };
      citextin: {
        Args: { "": unknown };
        Returns: string;
      };
      citextout: {
        Args: { "": string };
        Returns: unknown;
      };
      citextrecv: {
        Args: { "": unknown };
        Returns: string;
      };
      citextsend: {
        Args: { "": string };
        Returns: string;
      };
      current_property_ids: {
        Args: Record<PropertyKey, never>;
        Returns: string[];
      };
      gbt_bit_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_bool_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_bool_fetch: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_bpchar_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_bytea_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_cash_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_cash_fetch: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_date_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_date_fetch: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_decompress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_enum_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_enum_fetch: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_float4_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_float4_fetch: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_float8_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_float8_fetch: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_inet_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_int2_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_int2_fetch: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_int4_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_int4_fetch: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_int8_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_int8_fetch: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_intv_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_intv_decompress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_intv_fetch: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_macad_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_macad_fetch: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_macad8_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_macad8_fetch: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_numeric_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_oid_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_oid_fetch: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_text_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_time_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_time_fetch: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_timetz_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_ts_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_ts_fetch: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_tstz_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_uuid_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_uuid_fetch: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_var_decompress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbt_var_fetch: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbtreekey_var_in: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbtreekey_var_out: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbtreekey16_in: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbtreekey16_out: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbtreekey2_in: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbtreekey2_out: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbtreekey32_in: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbtreekey32_out: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbtreekey4_in: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbtreekey4_out: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbtreekey8_in: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gbtreekey8_out: {
        Args: { "": unknown };
        Returns: unknown;
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_tenant: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
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
