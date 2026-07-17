# Bash completion for create-next-pro.
_create_next_pro_complete() {
  local cur command candidates
  COMPREPLY=()
  cur="${COMP_WORDS[COMP_CWORD]}"
  command="${COMP_WORDS[1]}"
  if [[ ${COMP_CWORD} -eq 1 ]]; then
    candidates="$(create-next-pro __complete 2>/dev/null)"
  else
    candidates="$(create-next-pro __complete "${command}" 2>/dev/null)"
  fi
  mapfile -t COMPREPLY < <(compgen -W "${candidates}" -- "${cur}")
}
complete -F _create_next_pro_complete create-next-pro
