# Bash completion for create-next-pro.
_create_next_pro_complete() {
  local cur candidates
  local -a prior
  COMPREPLY=()
  cur="${COMP_WORDS[COMP_CWORD]}"
  if [[ ${COMP_CWORD} -eq 1 ]]; then
    candidates="$(create-next-pro __complete 2>/dev/null)"
  else
    prior=("${COMP_WORDS[@]:1:$((COMP_CWORD - 1))}")
    candidates="$(create-next-pro __complete "${prior[@]}" 2>/dev/null)"
  fi
  mapfile -t COMPREPLY < <(compgen -W "${candidates}" -- "${cur}")
}
complete -F _create_next_pro_complete create-next-pro
