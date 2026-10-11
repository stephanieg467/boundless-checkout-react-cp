#!/usr/bin/env bash
# Runs only on turns where Claude edited a project file (marker set by lint-edited-file.sh).
# Recheck after one automatic retry, but report persistent failures without looping.
input=$(jq -c '.') || exit 1
stop_hook_active=$(jq -r '.stop_hook_active // false' <<< "$input")
marker=.claude/.edited-$(jq -r '.session_id' <<< "$input")
project_dir=${CLAUDE_PROJECT_DIR:-$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)}
cd -- "$project_dir" || exit 1
[ -f "$marker" ] || exit 0
pass() { rm -f "$marker"; exit 0; }
export NO_COLOR=1 FORCE_COLOR=0

changed=$( { git diff --name-only "$(git merge-base origin/master HEAD)"; git ls-files --others --exclude-standard; } \
	| sort -u | grep -E '\.(ts|tsx|js|scss)$' | while read -r f; do [ -f "$f" ] && echo "$f"; done)
[ -z "$changed" ] && pass

fail() {
	message=$(printf '%s\n%s\n' "$1" "$(printf '%s\n' "$2" | grep -v 'pmg: ' | tail -40)")
	if [ "$stop_hook_active" = true ]; then
		jq -n --arg message "Automatic retry limit reached. Verification still failed:
$message" \
			'{systemMessage: $message}'
		pass
	else
		jq -n --arg reason "$message" '{decision: "block", reason: $reason}'
	fi
	exit 0
}

ts=$(echo "$changed" | grep -E '^src/.*\.(ts|tsx|js)$')
scss=$(echo "$changed" | grep -E '^styles/.*\.scss$')

if [ -n "$ts" ]; then
	out=$(npx eslint --no-warn-ignored --quiet $ts 2>&1) || fail "ESLint failed:" "$out"
fi
if [ -n "$scss" ]; then
	out=$(npx stylelint $scss 2>&1) || fail "Stylelint failed:" "$out"
fi

out=$(npm run -s verify 2>&1) || fail "Type check failed (npm run verify):" "$out"

out=$(npm run -s fallow:audit:ci 2>/dev/null) || fail "Fallow audit found introduced issues:" \
	"$(echo "$out" | jq -c '.. | objects | select(.introduced == true) | del(.actions)' 2>/dev/null || echo "$out")"

if [ -n "$ts" ]; then
	out=$(npx jest --findRelatedTests $ts 2>&1) || fail "Jest failed for tests related to changed files:" "$out"
fi
pass
