#!/usr/bin/env bash
# JSON feedback works in both Claude Code and pi-hooks.
input=$(jq -c '.') || exit 1
project_dir=${CLAUDE_PROJECT_DIR:-$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)}
cd -- "$project_dir" || exit 1
export NO_COLOR=1 FORCE_COLOR=0
project_dir=$(pwd -P)
file=$(jq -r '.tool_input.file_path // .tool_input.path // empty' <<< "$input")
[ -n "$file" ] || exit 0
file=${file#@}
case "$file" in '~'|'~/'*) file="$HOME${file:1}" ;; esac
cwd=$(jq -r '.cwd // empty' <<< "$input")
case "$file" in /*) ;; *) file="${cwd:-$project_dir}/$file" ;; esac
[ -f "$file" ] || exit 0
file=$(realpath -- "$file") || exit 1
case "$file" in "$project_dir"/*) ;; *) exit 0 ;; esac
touch ".claude/.edited-$(jq -r '.session_id | split("/")[-1]' <<< "$input")" || exit 1

case "$file" in
	*.ts|*.tsx|"$project_dir"/src/*.js)
		npx eslint --fix --no-warn-ignored "$file" >/dev/null 2>&1
		out=$(npx eslint --no-warn-ignored --quiet "$file" 2>&1) ;;
	*.scss)
		npx stylelint --fix "$file" >/dev/null 2>&1
		out=$(npx stylelint "$file" 2>&1) ;;
	*) exit 0 ;;
esac

[ $? -eq 0 ] && exit 0
jq -n --arg reason "$(printf '%s\n' "$out" | grep -v 'pmg: ')" '{decision: "block", reason: $reason}'
exit 0
