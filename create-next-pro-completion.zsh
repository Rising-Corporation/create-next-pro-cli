#compdef create-next-pro

_create_next_pro() {
  local command
  command="${words[2]}"
  if (( CURRENT == 2 )); then
    compadd -- ${(f)"$(create-next-pro __complete 2>/dev/null)"}
  else
    compadd -- ${(f)"$(create-next-pro __complete "${command}" 2>/dev/null)"}
  fi
}

compdef _create_next_pro create-next-pro
