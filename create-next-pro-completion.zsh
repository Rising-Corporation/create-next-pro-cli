#compdef create-next-pro

_create_next_pro() {
  local -a prior
  if (( CURRENT == 2 )); then
    compadd -- ${(f)"$(create-next-pro __complete 2>/dev/null)"}
  else
    prior=("${(@)words[2,$((CURRENT - 1))]}")
    compadd -- ${(f)"$(create-next-pro __complete "${prior[@]}" 2>/dev/null)"}
  fi
}

compdef _create_next_pro create-next-pro
