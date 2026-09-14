// Generated from local Supabase. Preserve generator type shapes when regenerating.
/* eslint-disable @typescript-eslint/consistent-type-definitions, @typescript-eslint/consistent-indexed-object-style, @typescript-eslint/no-redundant-type-constituents */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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
      profiles: {
        Row: {
          display_name: string;
          id: string;
          identification_label: string;
          role: string;
        };
        Insert: {
          display_name: string;
          id: string;
          identification_label: string;
          role: string;
        };
        Update: {
          display_name?: string;
          id?: string;
          identification_label?: string;
          role?: string;
        };
        Relationships: [];
      };
      trainer_assignments: {
        Row: {
          trainee_id: string;
          trainee_role: string;
          trainer_id: string;
          trainer_role: string;
        };
        Insert: {
          trainee_id: string;
          trainee_role?: string;
          trainer_id: string;
          trainer_role?: string;
        };
        Update: {
          trainee_id?: string;
          trainee_role?: string;
          trainer_id?: string;
          trainer_role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trainer_assignments_trainee_id_trainee_role_fkey";
            columns: ["trainee_id", "trainee_role"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id", "role"];
          },
          {
            foreignKeyName: "trainer_assignments_trainer_id_trainer_role_fkey";
            columns: ["trainer_id", "trainer_role"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id", "role"];
          },
        ];
      };
      training_comments: {
        Row: {
          author_id: string;
          body: string;
          id: string;
          updated_at: string;
          visibility: string;
          workout_id: string;
        };
        Insert: {
          author_id: string;
          body: string;
          id?: string;
          updated_at?: string;
          visibility?: string;
          workout_id: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          id?: string;
          updated_at?: string;
          visibility?: string;
          workout_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "training_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "training_comments_workout_id_fkey";
            columns: ["workout_id"];
            isOneToOne: false;
            referencedRelation: "training_workouts";
            referencedColumns: ["id"];
          },
        ];
      };
      training_plans: {
        Row: {
          created_at: string;
          id: string;
          title: string;
          trainee_id: string;
          trainer_id: string;
          valid_from: string;
          valid_until: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          title: string;
          trainee_id: string;
          trainer_id: string;
          valid_from: string;
          valid_until: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          title?: string;
          trainee_id?: string;
          trainer_id?: string;
          valid_from?: string;
          valid_until?: string;
        };
        Relationships: [
          {
            foreignKeyName: "training_plans_trainee_id_fkey";
            columns: ["trainee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "training_plans_trainer_id_fkey";
            columns: ["trainer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      training_workouts: {
        Row: {
          completed_at: string | null;
          corrected_at: string | null;
          created_at: string;
          id: string;
          plan_id: string;
          prescription: Json;
          results: Json | null;
          scheduled_for: string;
          snapshot: Json | null;
          started_at: string | null;
          status: string;
          trainee_id: string;
          trainer_id: string;
          unit_label: string;
          version: number;
          week_start: string;
        };
        Insert: {
          completed_at?: string | null;
          corrected_at?: string | null;
          created_at?: string;
          id?: string;
          plan_id: string;
          prescription: Json;
          results?: Json | null;
          scheduled_for: string;
          snapshot?: Json | null;
          started_at?: string | null;
          status?: string;
          trainee_id: string;
          trainer_id: string;
          unit_label: string;
          version?: number;
          week_start: string;
        };
        Update: {
          completed_at?: string | null;
          corrected_at?: string | null;
          created_at?: string;
          id?: string;
          plan_id?: string;
          prescription?: Json;
          results?: Json | null;
          scheduled_for?: string;
          snapshot?: Json | null;
          started_at?: string | null;
          status?: string;
          trainee_id?: string;
          trainer_id?: string;
          unit_label?: string;
          version?: number;
          week_start?: string;
        };
        Relationships: [
          {
            foreignKeyName: "training_workouts_plan_id_trainer_id_trainee_id_fkey";
            columns: ["plan_id", "trainer_id", "trainee_id"];
            isOneToOne: false;
            referencedRelation: "training_plans";
            referencedColumns: ["id", "trainer_id", "trainee_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      training_mutate: {
        Args: { p_action: string; p_payload: Json };
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
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
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
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
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
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
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
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
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
    Enums: {},
  },
} as const;
