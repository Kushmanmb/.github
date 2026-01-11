#!/bin/bash
# Bash configuration file with custom functions

# cwhois: Custom whois function that queries bgp.tools
# Usage: cwhois <query>
cwhois() {
    whois -h bgp.tools -v $*
}
export -f cwhois
