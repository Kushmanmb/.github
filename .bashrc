#!/bin/bash
# Bash configuration file with custom functions

# custom_whois_query: Custom whois function that queries bgp.tools for BGP information
# Usage: custom_whois_query <query>
custom_whois_query() {
    whois -h bgp.tools -v $*
}
export -f custom_whois_query
