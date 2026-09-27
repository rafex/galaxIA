#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

ROOT_DIR="$ROOT_DIR" ruby - <<'RUBY'
require "pathname"

root = Pathname(ENV.fetch("ROOT_DIR"))
files = Dir[root.join("docs/**/*.md").to_s] + Dir[root.join("site/docs/**/*.md").to_s]
errors = []

files.each do |file|
  File.read(file).scan(/\]\(([^)]+)\)/).flatten.each do |target|
    next if target.start_with?("http://", "https://", "mailto:", "#", "{{")

    path = target.split("#", 2).first
    next if path.empty?

    resolved = Pathname(file).dirname.join(path).cleanpath
    errors << "#{Pathname(file).relative_path_from(root)} -> #{target}" unless resolved.exist?
  end
end

abort "broken local Markdown links:\n#{errors.join("\n")}" unless errors.empty?
puts "Markdown local links valid (#{files.length} files)"
RUBY
