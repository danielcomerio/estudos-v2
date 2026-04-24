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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attempts: {
        Row: {
          acertou: boolean | null
          confianca: number | null
          created_at: string
          id: string
          marcada_revisao: boolean
          question_id: string
          rating: number | null
          resposta_letra: string | null
          session_id: string | null
          simulado_id: string | null
          tempo_gasto_ms: number | null
          user_id: string
        }
        Insert: {
          acertou?: boolean | null
          confianca?: number | null
          created_at?: string
          id?: string
          marcada_revisao?: boolean
          question_id: string
          rating?: number | null
          resposta_letra?: string | null
          session_id?: string | null
          simulado_id?: string | null
          tempo_gasto_ms?: number | null
          user_id: string
        }
        Update: {
          acertou?: boolean | null
          confianca?: number | null
          created_at?: string
          id?: string
          marcada_revisao?: boolean
          question_id?: string
          rating?: number | null
          resposta_letra?: string | null
          session_id?: string | null
          simulado_id?: string | null
          tempo_gasto_ms?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "public_questions_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      disc_attempts: {
        Row: {
          auto_avaliacao: Json | null
          avaliacao_ai: Json | null
          created_at: string
          discursive_id: string
          id: string
          pontuacao_final: number | null
          resposta_imagens: string[] | null
          resposta_texto: string | null
          session_id: string | null
          simulado_id: string | null
          tempo_gasto_ms: number | null
          user_id: string
          viu_espelho: boolean
        }
        Insert: {
          auto_avaliacao?: Json | null
          avaliacao_ai?: Json | null
          created_at?: string
          discursive_id: string
          id?: string
          pontuacao_final?: number | null
          resposta_imagens?: string[] | null
          resposta_texto?: string | null
          session_id?: string | null
          simulado_id?: string | null
          tempo_gasto_ms?: number | null
          user_id: string
          viu_espelho?: boolean
        }
        Update: {
          auto_avaliacao?: Json | null
          avaliacao_ai?: Json | null
          created_at?: string
          discursive_id?: string
          id?: string
          pontuacao_final?: number | null
          resposta_imagens?: string[] | null
          resposta_texto?: string | null
          session_id?: string | null
          simulado_id?: string | null
          tempo_gasto_ms?: number | null
          user_id?: string
          viu_espelho?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "disc_attempts_discursive_id_fkey"
            columns: ["discursive_id"]
            isOneToOne: false
            referencedRelation: "discursives"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplines: {
        Row: {
          cor_hex: string | null
          created_at: string
          icone: string | null
          id: string
          module: string | null
          name: string
          ordem: number
          short_name: string | null
          slug: string
        }
        Insert: {
          cor_hex?: string | null
          created_at?: string
          icone?: string | null
          id?: string
          module?: string | null
          name: string
          ordem?: number
          short_name?: string | null
          slug: string
        }
        Update: {
          cor_hex?: string | null
          created_at?: string
          icone?: string | null
          id?: string
          module?: string | null
          name?: string
          ordem?: number
          short_name?: string | null
          slug?: string
        }
        Relationships: []
      }
      discursives: {
        Row: {
          apostas_relacionadas: string[] | null
          banca_estilo: string | null
          comando: string | null
          conceitos_chave: string[] | null
          created_at: string
          deleted_at: string | null
          dificuldade: number
          discipline_id: string
          enunciado_completo: string
          espelho_resposta: string | null
          estrategia_redacao: string | null
          id: string
          max_linhas: number
          observacoes_corretor: string | null
          origem: string
          origem_details: Json | null
          pegadinhas_esperadas: string[] | null
          pontuacao_maxima: number
          quesitos: Json | null
          rubrica: Json | null
          study_profile_id: string | null
          tema: string | null
          texto_base: string | null
          tipo_discursiva: string | null
          topic_id: string | null
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          apostas_relacionadas?: string[] | null
          banca_estilo?: string | null
          comando?: string | null
          conceitos_chave?: string[] | null
          created_at?: string
          deleted_at?: string | null
          dificuldade?: number
          discipline_id: string
          enunciado_completo: string
          espelho_resposta?: string | null
          estrategia_redacao?: string | null
          id?: string
          max_linhas?: number
          observacoes_corretor?: string | null
          origem?: string
          origem_details?: Json | null
          pegadinhas_esperadas?: string[] | null
          pontuacao_maxima?: number
          quesitos?: Json | null
          rubrica?: Json | null
          study_profile_id?: string | null
          tema?: string | null
          texto_base?: string | null
          tipo_discursiva?: string | null
          topic_id?: string | null
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          apostas_relacionadas?: string[] | null
          banca_estilo?: string | null
          comando?: string | null
          conceitos_chave?: string[] | null
          created_at?: string
          deleted_at?: string | null
          dificuldade?: number
          discipline_id?: string
          enunciado_completo?: string
          espelho_resposta?: string | null
          estrategia_redacao?: string | null
          id?: string
          max_linhas?: number
          observacoes_corretor?: string | null
          origem?: string
          origem_details?: Json | null
          pegadinhas_esperadas?: string[] | null
          pontuacao_maxima?: number
          quesitos?: Json | null
          rubrica?: Json | null
          study_profile_id?: string | null
          tema?: string | null
          texto_base?: string | null
          tipo_discursiva?: string | null
          topic_id?: string | null
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "discursives_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discursives_study_profile_id_fkey"
            columns: ["study_profile_id"]
            isOneToOne: false
            referencedRelation: "study_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discursives_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          anthropic_api_key_encrypted: string | null
          bio: string | null
          created_at: string
          credits_daily_allowance: number
          credits_reset_at: string | null
          credits_used_today: number
          display_name: string | null
          email: string | null
          handle: string | null
          id: string
          is_public_profile: boolean
          tier: string
          updated_at: string
        }
        Insert: {
          anthropic_api_key_encrypted?: string | null
          bio?: string | null
          created_at?: string
          credits_daily_allowance?: number
          credits_reset_at?: string | null
          credits_used_today?: number
          display_name?: string | null
          email?: string | null
          handle?: string | null
          id: string
          is_public_profile?: boolean
          tier?: string
          updated_at?: string
        }
        Update: {
          anthropic_api_key_encrypted?: string | null
          bio?: string | null
          created_at?: string
          credits_daily_allowance?: number
          credits_reset_at?: string | null
          credits_used_today?: number
          display_name?: string | null
          email?: string | null
          handle?: string | null
          id?: string
          is_public_profile?: boolean
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      question_comments: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          parent_comment_id: string | null
          question_id: string
          texto: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_comment_id?: string | null
          question_id: string
          texto: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_comment_id?: string | null
          question_id?: string
          texto?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "question_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_comments_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "public_questions_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_comments_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      question_feedback: {
        Row: {
          comentario: string | null
          created_at: string
          id: string
          motivo: string | null
          question_id: string
          target: string
          user_id: string
          vote: number
        }
        Insert: {
          comentario?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          question_id: string
          target: string
          user_id: string
          vote: number
        }
        Update: {
          comentario?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          question_id?: string
          target?: string
          user_id?: string
          vote?: number
        }
        Relationships: [
          {
            foreignKeyName: "question_feedback_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "public_questions_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_feedback_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          alternativas: Json
          banca_estilo: string | null
          created_at: string
          deleted_at: string | null
          dificuldade: number
          discipline_id: string
          enunciado: string
          enunciado_hash: string | null
          explicacao_geral: string | null
          forked_from: string | null
          gabarito: string
          id: string
          origem: string
          origem_details: Json | null
          pegadinhas: string[] | null
          quality_score: number
          study_profile_id: string | null
          tema: string | null
          topic_id: string | null
          total_feedback_negative: number
          total_feedback_positive: number
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          alternativas: Json
          banca_estilo?: string | null
          created_at?: string
          deleted_at?: string | null
          dificuldade?: number
          discipline_id: string
          enunciado: string
          enunciado_hash?: string | null
          explicacao_geral?: string | null
          forked_from?: string | null
          gabarito: string
          id?: string
          origem?: string
          origem_details?: Json | null
          pegadinhas?: string[] | null
          quality_score?: number
          study_profile_id?: string | null
          tema?: string | null
          topic_id?: string | null
          total_feedback_negative?: number
          total_feedback_positive?: number
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          alternativas?: Json
          banca_estilo?: string | null
          created_at?: string
          deleted_at?: string | null
          dificuldade?: number
          discipline_id?: string
          enunciado?: string
          enunciado_hash?: string | null
          explicacao_geral?: string | null
          forked_from?: string | null
          gabarito?: string
          id?: string
          origem?: string
          origem_details?: Json | null
          pegadinhas?: string[] | null
          quality_score?: number
          study_profile_id?: string | null
          tema?: string | null
          topic_id?: string | null
          total_feedback_negative?: number
          total_feedback_positive?: number
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_forked_from_fkey"
            columns: ["forked_from"]
            isOneToOne: false
            referencedRelation: "public_questions_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_forked_from_fkey"
            columns: ["forked_from"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_study_profile_id_fkey"
            columns: ["study_profile_id"]
            isOneToOne: false
            referencedRelation: "study_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          motivo: string | null
          reporter_user_id: string
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          motivo?: string | null
          reporter_user_id: string
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          motivo?: string | null
          reporter_user_id?: string
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          difficulty: number | null
          due: string | null
          elapsed_days: number | null
          id: string
          lapses: number
          last_review: string | null
          question_id: string
          reps: number
          scheduled_days: number | null
          stability: number | null
          state: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: number | null
          due?: string | null
          elapsed_days?: number | null
          id?: string
          lapses?: number
          last_review?: string | null
          question_id: string
          reps?: number
          scheduled_days?: number | null
          stability?: number | null
          state?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: number | null
          due?: string | null
          elapsed_days?: number | null
          id?: string
          lapses?: number
          last_review?: string | null
          question_id?: string
          reps?: number
          scheduled_days?: number | null
          stability?: number | null
          state?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "public_questions_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      simulado_templates: {
        Row: {
          cotas: Json
          created_at: string
          criterio_selecao: string
          descricao: string | null
          dificuldade_max: number
          dificuldade_min: number
          id: string
          is_default: boolean
          nome: string
          num_discursivas: number
          num_questoes_objetivas: number
          study_profile_id: string | null
          tempo_minutos: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cotas?: Json
          created_at?: string
          criterio_selecao?: string
          descricao?: string | null
          dificuldade_max?: number
          dificuldade_min?: number
          id?: string
          is_default?: boolean
          nome: string
          num_discursivas?: number
          num_questoes_objetivas?: number
          study_profile_id?: string | null
          tempo_minutos?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cotas?: Json
          created_at?: string
          criterio_selecao?: string
          descricao?: string | null
          dificuldade_max?: number
          dificuldade_min?: number
          id?: string
          is_default?: boolean
          nome?: string
          num_discursivas?: number
          num_questoes_objetivas?: number
          study_profile_id?: string | null
          tempo_minutos?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulado_templates_study_profile_id_fkey"
            columns: ["study_profile_id"]
            isOneToOne: false
            referencedRelation: "study_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      simulados: {
        Row: {
          created_at: string
          discursivas_ids: string[]
          finalizado_em: string | null
          flags: string[]
          id: string
          iniciado_em: string
          nome_snapshot: string | null
          pontuacao_discursiva: number | null
          pontuacao_objetiva: number | null
          pontuacao_total: number | null
          questoes_ids: string[]
          status: string
          template_id: string | null
          tempo_total_ms: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          discursivas_ids?: string[]
          finalizado_em?: string | null
          flags?: string[]
          id?: string
          iniciado_em?: string
          nome_snapshot?: string | null
          pontuacao_discursiva?: number | null
          pontuacao_objetiva?: number | null
          pontuacao_total?: number | null
          questoes_ids?: string[]
          status?: string
          template_id?: string | null
          tempo_total_ms?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          discursivas_ids?: string[]
          finalizado_em?: string | null
          flags?: string[]
          id?: string
          iniciado_em?: string
          nome_snapshot?: string | null
          pontuacao_discursiva?: number | null
          pontuacao_objetiva?: number | null
          pontuacao_total?: number | null
          questoes_ids?: string[]
          status?: string
          template_id?: string | null
          tempo_total_ms?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulados_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "simulado_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      study_profile_disciplines: {
        Row: {
          discipline_id: string
          id: string
          num_questoes: number | null
          peso: number
          pontos_por_questao: number | null
          pontuacao_minima: number
          study_profile_id: string
        }
        Insert: {
          discipline_id: string
          id?: string
          num_questoes?: number | null
          peso?: number
          pontos_por_questao?: number | null
          pontuacao_minima?: number
          study_profile_id: string
        }
        Update: {
          discipline_id?: string
          id?: string
          num_questoes?: number | null
          peso?: number
          pontos_por_questao?: number | null
          pontuacao_minima?: number
          study_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_profile_disciplines_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_profile_disciplines_study_profile_id_fkey"
            columns: ["study_profile_id"]
            isOneToOne: false
            referencedRelation: "study_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_profiles: {
        Row: {
          banca: string | null
          cargo: string | null
          config: Json
          created_at: string
          data_prova: string | null
          id: string
          is_active: boolean
          is_default: boolean
          nome: string
          nome_concurso: string | null
          orgao: string | null
          schema_version: number
          updated_at: string
          user_id: string
        }
        Insert: {
          banca?: string | null
          cargo?: string | null
          config?: Json
          created_at?: string
          data_prova?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          nome: string
          nome_concurso?: string | null
          orgao?: string | null
          schema_version?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          banca?: string | null
          cargo?: string | null
          config?: Json
          created_at?: string
          data_prova?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          nome?: string
          nome_concurso?: string | null
          orgao?: string | null
          schema_version?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          config: Json
          finalizada: boolean
          finalizada_em: string | null
          id: string
          iniciada_em: string
          modo: string
          nome: string | null
          num_questoes_alvo: number | null
          num_questoes_respondidas: number
          study_profile_id: string | null
          tempo_total_ms: number
          user_id: string
        }
        Insert: {
          config?: Json
          finalizada?: boolean
          finalizada_em?: string | null
          id?: string
          iniciada_em?: string
          modo?: string
          nome?: string | null
          num_questoes_alvo?: number | null
          num_questoes_respondidas?: number
          study_profile_id?: string | null
          tempo_total_ms?: number
          user_id: string
        }
        Update: {
          config?: Json
          finalizada?: boolean
          finalizada_em?: string | null
          id?: string
          iniciada_em?: string
          modo?: string
          nome?: string | null
          num_questoes_alvo?: number | null
          num_questoes_respondidas?: number
          study_profile_id?: string | null
          tempo_total_ms?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_study_profile_id_fkey"
            columns: ["study_profile_id"]
            isOneToOne: false
            referencedRelation: "study_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          discipline_id: string
          id: string
          name: string
          ordem: number
          parent_topic_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          discipline_id: string
          id?: string
          name: string
          ordem?: number
          parent_topic_id?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          discipline_id?: string
          id?: string
          name?: string
          ordem?: number
          parent_topic_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_parent_topic_id_fkey"
            columns: ["parent_topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_questions_feed: {
        Row: {
          alternativas: Json | null
          author_handle: string | null
          author_is_public: boolean | null
          author_name: string | null
          banca_estilo: string | null
          created_at: string | null
          dificuldade: number | null
          discipline_id: string | null
          enunciado: string | null
          explicacao_geral: string | null
          gabarito: string | null
          id: string | null
          quality_score: number | null
          tema: string | null
          topic_id: string | null
          total_feedback_negative: number | null
          total_feedback_positive: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_discipline_id_fkey"
            columns: ["discipline_id"]
            isOneToOne: false
            referencedRelation: "disciplines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_statistics: {
        Row: {
          due_now: number | null
          total_attempts: number | null
          total_correct: number | null
          total_disc_attempts: number | null
          total_discursives: number | null
          total_questions: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      consume_credits: { Args: { p_amount: number }; Returns: Json }
      fork_question: { Args: { p_question_id: string }; Returns: string }
      get_due_questions: {
        Args: { p_limit?: number; p_study_profile_id: string }
        Returns: {
          alternativas: Json
          banca_estilo: string | null
          created_at: string
          deleted_at: string | null
          dificuldade: number
          discipline_id: string
          enunciado: string
          enunciado_hash: string | null
          explicacao_geral: string | null
          forked_from: string | null
          gabarito: string
          id: string
          origem: string
          origem_details: Json | null
          pegadinhas: string[] | null
          quality_score: number
          study_profile_id: string | null
          tema: string | null
          topic_id: string | null
          total_feedback_negative: number
          total_feedback_positive: number
          updated_at: string
          user_id: string
          visibility: string
        }[]
        SetofOptions: {
          from: "*"
          to: "questions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_profile_disciplines: {
        Args: { p_study_profile_id: string }
        Returns: {
          cor_hex: string
          discipline_id: string
          icone: string
          module: string
          name: string
          num_questoes: number
          ordem: number
          peso: number
          pontos_por_questao: number
          pontuacao_minima: number
          short_name: string
          slug: string
        }[]
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
