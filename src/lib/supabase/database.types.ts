export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
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
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      advances: {
        Row: {
          amount_cents: number;
          date: string;
          id: string;
          month: number;
          position: number;
          user_id: string;
          year: number;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          date: string;
          id?: string;
          month: number;
          position: number;
          user_id?: string;
          year: number;
        };
        Update: {
          amount_cents?: number;
          date?: string;
          id?: string;
          month?: number;
          position?: number;
          user_id?: string;
          year?: number;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          address: string;
          archived: boolean;
          created_at: string;
          id: string;
          km_calculated_at: string | null;
          name: string;
          round_trip_km: number | null;
          town: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string;
          archived?: boolean;
          created_at?: string;
          id?: string;
          km_calculated_at?: string | null;
          name: string;
          round_trip_km?: number | null;
          town?: string;
          user_id?: string;
        };
        Update: {
          address?: string;
          archived?: boolean;
          created_at?: string;
          id?: string;
          km_calculated_at?: string | null;
          name?: string;
          round_trip_km?: number | null;
          town?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          amount_cents: number;
          category: Database["public"]["Enums"]["expense_category"];
          client_id: string | null;
          created_at: string;
          date: string;
          id: string;
          km: number | null;
          km_rate: number | null;
          notes: string | null;
          place: string;
          project: string;
          receipt_image_path: string | null;
          receipt_path: string | null;
          user_id: string;
          vendor_name: string | null;
          vendor_tax_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          category: Database["public"]["Enums"]["expense_category"];
          client_id?: string | null;
          created_at?: string;
          date: string;
          id?: string;
          km?: number | null;
          km_rate?: number | null;
          notes?: string | null;
          place?: string;
          project?: string;
          receipt_image_path?: string | null;
          receipt_path?: string | null;
          user_id?: string;
          vendor_name?: string | null;
          vendor_tax_id?: string | null;
        };
        Update: {
          amount_cents?: number;
          category?: Database["public"]["Enums"]["expense_category"];
          client_id?: string | null;
          created_at?: string;
          date?: string;
          id?: string;
          km?: number | null;
          km_rate?: number | null;
          notes?: string | null;
          place?: string;
          project?: string;
          receipt_image_path?: string | null;
          receipt_path?: string | null;
          user_id?: string;
          vendor_name?: string | null;
          vendor_tax_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      month_closings: {
        Row: {
          itm_hours: boolean;
          month: number;
          time_control: boolean;
          user_id: string;
          year: number;
        };
        ComputedFields: never;
        Insert: {
          itm_hours?: boolean;
          month: number;
          time_control?: boolean;
          user_id?: string;
          year: number;
        };
        Update: {
          itm_hours?: boolean;
          month?: number;
          time_control?: boolean;
          user_id?: string;
          year?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          company: string;
          full_name: string;
          km_rate: number;
          origin_address: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          company?: string;
          full_name?: string;
          km_rate?: number;
          origin_address?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          company?: string;
          full_name?: string;
          km_rate?: number;
          origin_address?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      expense_category:
        "km" | "autopistes" | "dietes" | "allotjaments" | "bitllets" | "altres";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
    Enums: {
      expense_category: [
        "km",
        "autopistes",
        "dietes",
        "allotjaments",
        "bitllets",
        "altres",
      ],
    },
  },
} as const;
