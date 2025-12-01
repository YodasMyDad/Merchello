@ECHO OFF
:: This file can now be deleted!
:: It was used when setting up the package solution (using https://github.com/LottePitcher/opinionated-package-starter)

:: set up git
git init
git branch -M main
git remote add origin https://github.com/GITHUB_USERNAME/GITHUB_REPOSITORY.git

:: ensure latest Umbraco templates used
dotnet new install Umbraco.Templates --force

:: use the umbraco-extension dotnet template to add the package project
cd src
dotnet new umbraco-extension -n "Merchello" --site-domain "https://localhost:44371" --include-example

:: replace package .csproj with the one from the template so has nuget info
cd Merchello
del Merchello.csproj
ren Merchello_nuget.csproj Merchello.csproj

:: add project to solution
cd..
dotnet sln add "Merchello"

:: add reference to project from test site
dotnet add "Merchello.TestSite/Merchello.TestSite.csproj" reference "Merchello/Merchello.csproj"
