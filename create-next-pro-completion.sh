# Bash completion for create-next-pro
_create_next_pro_complete() {
  local cur prev opts
  COMPREPLY=()
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"
  opts="addpage addcomponent addlib addapi rmpage"

  # Autocomplete commands
  if [[ ${COMP_CWORD} == 1 ]]; then
    COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
    return 0
  fi

  # Autocomplete page/component names for addpage/addcomponent
  if [[ ${COMP_CWORD} == 2 && ( ${prev} == "addpage" || ${prev} == "addcomponent" ) ]]; then
    # List all nested page/component paths under src/ui
    local IFS=$'\n'
    local items=( $(find src/ui -type d | sed 's|src/ui/||; /^$/d' | grep -v '^$' | grep -v '^\.$' | grep -v '^src/ui$') )
    # Explicitly remove src/ui
    items=( "${items[@]}" )
    COMPREPLY=( $(compgen -W "${items[*]}" -- ${cur}) )
    return 0
  fi

  # Autocomplete nested children after dot for addpage
  if [[ ${COMP_CWORD} == 2 && ${prev} == "addpage" && "${cur}" == *.* ]]; then
    local parent=${cur%%.*}
    local prefix=${cur#*.}
    local IFS=$'\n'
    local children=( $(find src/ui/${parent} -mindepth 1 -type d | sed "s|src/ui/${parent}/||") )
    COMPREPLY=( $(compgen -W "${children[*]}" -- ${prefix}) )
    return 0
  fi
  
  # Autocomplete page names for rmpage (based on src/ui)
  if [[ ${COMP_CWORD} == 2 && ${prev} == "rmpage" ]]; then
    local IFS=$'\n'
    local pages=( $(find src/ui -type d | sed 's|src/ui/||; /^$/d' | grep -v '^$' | grep -v '^\.$' | grep -v '^src/ui$') )
    COMPREPLY=( $(compgen -W "${pages[*]}" -- ${cur}) )
    return 0
  fi
}
complete -F _create_next_pro_complete create-next-pro
