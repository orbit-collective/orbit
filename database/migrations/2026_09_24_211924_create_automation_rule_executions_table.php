<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('automation_rule_executions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('automation_rule_id')->constrained('automation_rules')->cascadeOnDelete();
            $table->string('idempotency_key');
            $table->timestamp('executed_at');

            $table->unique(['automation_rule_id', 'idempotency_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('automation_rule_executions');
    }
};
