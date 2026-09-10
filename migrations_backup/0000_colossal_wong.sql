CREATE TABLE "app_admins" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "app_admins_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "app_packages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game" text NOT NULL,
	"name" text NOT NULL,
	"in_game_amount" integer NOT NULL,
	"usdt_value" numeric(10, 4) NOT NULL,
	"image" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "app_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"package_id" varchar NOT NULL,
	"payment_id" text NOT NULL,
	"txid" text,
	"pi_amount" numeric(18, 8) NOT NULL,
	"usd_amount" numeric(10, 4) NOT NULL,
	"pi_price_at_time" numeric(10, 4) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"game_account" jsonb NOT NULL,
	"metadata" jsonb,
	"email_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "app_transactions_payment_id_unique" UNIQUE("payment_id")
);
--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pi_uid" text NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"country" text DEFAULT 'Bhutan' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"wallet_address" text NOT NULL,
	"game_accounts" jsonb,
	"referral_code" text UNIQUE,
	"passphrase" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_profile_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "app_users_pi_uid_unique" UNIQUE("pi_uid")
);
--> statement-breakpoint
CREATE TABLE "pi_price_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"price" numeric(10, 4) NOT NULL,
	"source" text DEFAULT 'coingecko' NOT NULL,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "app_transactions" ADD CONSTRAINT "app_transactions_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_transactions" ADD CONSTRAINT "app_transactions_package_id_app_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."app_packages"("id") ON DELETE no action ON UPDATE no action;