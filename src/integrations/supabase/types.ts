export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      auto_responses: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          priority: number | null
          response_text: string
          trigger_keyword: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          priority?: number | null
          response_text: string
          trigger_keyword: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          priority?: number | null
          response_text?: string
          trigger_keyword?: string
        }
        Relationships: []
      }
      bot_flows: {
        Row: {
          created_at: string
          description: string | null
          flow_data: Json
          id: string
          is_active: boolean | null
          name: string
          trigger_keywords: string[] | null
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          flow_data: Json
          id?: string
          is_active?: boolean | null
          name: string
          trigger_keywords?: string[] | null
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          flow_data?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          trigger_keywords?: string[] | null
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: []
      }
      bot_sessions: {
        Row: {
          conversation_id: string
          created_at: string
          current_node_id: string | null
          flow_id: string | null
          id: string
          is_active: boolean | null
          session_data: Json | null
          updated_at: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          current_node_id?: string | null
          flow_id?: string | null
          id?: string
          is_active?: boolean | null
          session_data?: Json | null
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          current_node_id?: string | null
          flow_id?: string | null
          id?: string
          is_active?: boolean | null
          session_data?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_sessions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "bot_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          assigned_operator_id: string | null
          auto_closed_at: string | null
          bot_session_id: string | null
          created_at: string
          customer_id: string
          id: string
          last_message_at: string | null
          priority: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_operator_id?: string | null
          auto_closed_at?: string | null
          bot_session_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          last_message_at?: string | null
          priority?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_operator_id?: string | null
          auto_closed_at?: string | null
          bot_session_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          last_message_at?: string | null
          priority?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_operator_id_fkey"
            columns: ["assigned_operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_bot_session_id_fkey"
            columns: ["bot_session_id"]
            isOneToOne: false
            referencedRelation: "bot_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          cnpj: string | null
          created_at: string
          custom_fields: Json | null
          email: string | null
          id: string
          name: string | null
          notes: string | null
          tags: string[] | null
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          tags?: string[] | null
          updated_at?: string
          whatsapp_number: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          tags?: string[] | null
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      flow_nodes: {
        Row: {
          conditions: Json | null
          content: string | null
          created_at: string
          flow_id: string
          id: string
          next_node_id: string | null
          node_id: string
          node_type: string
          options: Json | null
        }
        Insert: {
          conditions?: Json | null
          content?: string | null
          created_at?: string
          flow_id: string
          id?: string
          next_node_id?: string | null
          node_id: string
          node_type: string
          options?: Json | null
        }
        Update: {
          conditions?: Json | null
          content?: string | null
          created_at?: string
          flow_id?: string
          id?: string
          next_node_id?: string | null
          node_id?: string
          node_type?: string
          options?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_nodes_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "bot_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          media_url: string | null
          message_type: string | null
          replied_to_message_id: string | null
          sender_id: string | null
          sender_type: string
          whatsapp_message_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          media_url?: string | null
          message_type?: string | null
          replied_to_message_id?: string | null
          sender_id?: string | null
          sender_type: string
          whatsapp_message_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          media_url?: string | null
          message_type?: string | null
          replied_to_message_id?: string | null
          sender_id?: string | null
          sender_type?: string
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          created_at: string
          email: string
          id: string
          is_available: boolean | null
          is_online: boolean | null
          max_concurrent_chats: number | null
          name: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_available?: boolean | null
          is_online?: boolean | null
          max_concurrent_chats?: number | null
          name: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_available?: boolean | null
          is_online?: boolean | null
          max_concurrent_chats?: number | null
          name?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quick_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          is_global: boolean | null
          operator_id: string | null
          shortcut: string | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_global?: boolean | null
          operator_id?: string | null
          shortcut?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_global?: boolean | null
          operator_id?: string | null
          shortcut?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_replies_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_leads: {
        Row: {
          assigned_operator_id: string | null
          created_at: string
          customer_id: string
          id: string
          next_followup_at: string | null
          notes: string | null
          probability: number | null
          stage_id: string
          updated_at: string
          value: number | null
        }
        Insert: {
          assigned_operator_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          next_followup_at?: string | null
          notes?: string | null
          probability?: number | null
          stage_id: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          assigned_operator_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          next_followup_at?: string | null
          notes?: string | null
          probability?: number | null
          stage_id?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_leads_assigned_operator_id_fkey"
            columns: ["assigned_operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "sales_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_stages: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          order_position: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_position: number
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_position?: number
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_auth: {
        Row: {
          created_at: string
          data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_sessions: {
        Row: {
          created_at: string
          id: string
          is_connected: boolean | null
          last_ping_at: string | null
          qr_code: string | null
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_connected?: boolean | null
          last_ping_at?: string | null
          qr_code?: string | null
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_connected?: boolean | null
          last_ping_at?: string | null
          qr_code?: string | null
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_status: {
        Row: {
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_operator_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_operator_role: {
        Args: { _role: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
