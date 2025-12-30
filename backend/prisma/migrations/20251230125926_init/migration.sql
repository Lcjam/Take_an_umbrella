-- CreateEnum
CREATE TYPE "notification_status" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "device_id" VARCHAR(255) NOT NULL,
    "anonymous_id" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "last_active_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "departure_time" VARCHAR(8) NOT NULL,
    "notification_time" VARCHAR(8) NOT NULL,
    "location_latitude" DECIMAL(10,8),
    "location_longitude" DECIMAL(11,8),
    "location_name" VARCHAR(255),
    "fcm_token" VARCHAR(500),
    "notification_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather_data" (
    "id" UUID NOT NULL,
    "location_latitude" DECIMAL(10,8) NOT NULL,
    "location_longitude" DECIMAL(11,8) NOT NULL,
    "forecast_date" DATE NOT NULL,
    "forecast_time" VARCHAR(8) NOT NULL,
    "temperature" DECIMAL(5,2),
    "humidity" INTEGER,
    "precipitation_probability" INTEGER,
    "precipitation_amount" DECIMAL(5,2),
    "wind_speed" DECIMAL(5,2),
    "wind_direction" INTEGER,
    "sky_condition" VARCHAR(50),
    "uv_index" INTEGER,
    "weather_data" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "weather_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "notification_type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "recommendation" JSONB,
    "weather_data_id" UUID,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "notification_status" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "feedback_received" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "notification_log_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback_text" TEXT,
    "nlp_analysis" JSONB,
    "feedback_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_ml_models" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "model_type" VARCHAR(50) NOT NULL,
    "model_version" INTEGER NOT NULL DEFAULT 1,
    "parameters" JSONB NOT NULL,
    "feedback_count" INTEGER NOT NULL DEFAULT 0,
    "accuracy_score" DECIMAL(5,4),
    "trained_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_ml_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_rules" (
    "id" UUID NOT NULL,
    "condition_type" VARCHAR(50) NOT NULL,
    "condition_operator" VARCHAR(20) NOT NULL,
    "condition_value" JSONB NOT NULL,
    "recommendation_type" VARCHAR(50) NOT NULL,
    "recommendation_value" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "recommendation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_device_id_key" ON "users"("device_id");

-- CreateIndex
CREATE INDEX "users_device_id_idx" ON "users"("device_id");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "users_last_active_at_idx" ON "users"("last_active_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");

-- CreateIndex
CREATE INDEX "user_settings_user_id_idx" ON "user_settings"("user_id");

-- CreateIndex
CREATE INDEX "user_settings_notification_time_idx" ON "user_settings"("notification_time");

-- CreateIndex
CREATE INDEX "user_settings_location_latitude_location_longitude_idx" ON "user_settings"("location_latitude", "location_longitude");

-- CreateIndex
CREATE INDEX "weather_data_location_latitude_location_longitude_idx" ON "weather_data"("location_latitude", "location_longitude");

-- CreateIndex
CREATE INDEX "weather_data_forecast_date_forecast_time_idx" ON "weather_data"("forecast_date", "forecast_time");

-- CreateIndex
CREATE INDEX "weather_data_created_at_idx" ON "weather_data"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "weather_data_location_latitude_location_longitude_forecast__key" ON "weather_data"("location_latitude", "location_longitude", "forecast_date", "forecast_time");

-- CreateIndex
CREATE INDEX "notification_logs_user_id_idx" ON "notification_logs"("user_id");

-- CreateIndex
CREATE INDEX "notification_logs_sent_at_idx" ON "notification_logs"("sent_at");

-- CreateIndex
CREATE INDEX "notification_logs_status_idx" ON "notification_logs"("status");

-- CreateIndex
CREATE INDEX "notification_logs_feedback_received_idx" ON "notification_logs"("feedback_received");

-- CreateIndex
CREATE UNIQUE INDEX "feedbacks_notification_log_id_key" ON "feedbacks"("notification_log_id");

-- CreateIndex
CREATE INDEX "feedbacks_user_id_idx" ON "feedbacks"("user_id");

-- CreateIndex
CREATE INDEX "feedbacks_notification_log_id_idx" ON "feedbacks"("notification_log_id");

-- CreateIndex
CREATE INDEX "feedbacks_rating_idx" ON "feedbacks"("rating");

-- CreateIndex
CREATE INDEX "feedbacks_feedback_date_idx" ON "feedbacks"("feedback_date");

-- CreateIndex
CREATE INDEX "feedbacks_created_at_idx" ON "feedbacks"("created_at");

-- CreateIndex
CREATE INDEX "user_ml_models_user_id_idx" ON "user_ml_models"("user_id");

-- CreateIndex
CREATE INDEX "user_ml_models_model_type_idx" ON "user_ml_models"("model_type");

-- CreateIndex
CREATE INDEX "user_ml_models_feedback_count_idx" ON "user_ml_models"("feedback_count");

-- CreateIndex
CREATE UNIQUE INDEX "user_ml_models_user_id_model_type_model_version_key" ON "user_ml_models"("user_id", "model_type", "model_version");

-- CreateIndex
CREATE INDEX "recommendation_rules_condition_type_idx" ON "recommendation_rules"("condition_type");

-- CreateIndex
CREATE INDEX "recommendation_rules_enabled_priority_idx" ON "recommendation_rules"("enabled", "priority");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_weather_data_id_fkey" FOREIGN KEY ("weather_data_id") REFERENCES "weather_data"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_notification_log_id_fkey" FOREIGN KEY ("notification_log_id") REFERENCES "notification_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ml_models" ADD CONSTRAINT "user_ml_models_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
