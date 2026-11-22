#!/usr/bin/env bash
# Skips the checks when the working tree matches the last one that passed.
# Recheck after one automatic retry, but report persistent failures without looping.
input=$(jq -c '.') || exit 1
stop_hook_active=$(jq -r '.stop_hook_active // false' <<< "$input")
project_dir=${CLAUDE_PROJECT_DIR:-$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)}
cd -- "$project_dir" || exit 1
state=.claude/.verified-tree
tree=$( { git rev-parse HEAD; git status --porcelain; git ls-files -m -o --exclude-standard -z | xargs -0 -r sha1sum 2>/dev/null; } | sha1sum)
[ "$(cat "$state" 2>/dev/null)" = "$tree" ] && exit 0
pass() { echo "$tree" > "$state"; exit 0; }
export NO_COLOR=1 FORCE_COLOR=0

changed=$( { git diff --name-only "$(git merge-base origin/master HEAD)"; git ls-files --others --exclude-standard; } \
	| sort -u | grep -E '\.(ts|tsx|mts|cts|js|scss)$' | while read -r f; do [ -f "$f" ] && echo "$f"; done)
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
	out=$(npx --no-install vitest related --run $ts 2>&1) || fail "Vitest failed for tests related to changed files:" "$out"
fi
pass
