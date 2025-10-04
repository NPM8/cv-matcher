{ pkgs, lib, config, inputs, ... }:

{
  # https://devenv.sh/packages/
  packages = [ pkgs.git ];

  languages.javascript = {
    enable = true;
    npm = {
      enable = true;
    };
  };

  languages.typescript.enable = true;
}
