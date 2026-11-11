#!/usr/bin/env bash
   # Leser verktøykallet fra stdin og blokkerer farlige mønstre
   input=$(cat)

   deny() {
     printf '{"permissionDecision":"deny","permissionDecisionReason":"%s"}\n' "$1"
     exit 0
   }

   echo "$input" | grep -Eq 'rm -(rf|fr)'               && deny "rm -rf er blokkert av teamets guardrails"
   echo "$input" | grep -Eq 'git push.*(--force| -f)'   && deny "Force push er ikke tillatt"
   echo "$input" | grep -Eq '\.env'                     && deny "Agenten får ikke lese .env-filer"
   exit 0