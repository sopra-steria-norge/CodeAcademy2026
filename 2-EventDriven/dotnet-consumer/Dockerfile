FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Common/Common.csproj Common/
COPY Consumer/Consumer.csproj Consumer/
COPY Producer/Producer.csproj Producer/
RUN dotnet restore Consumer/Consumer.csproj
RUN dotnet restore Producer/Producer.csproj
COPY . .
RUN dotnet publish Consumer/Consumer.csproj -c Release -o /app/consumer
RUN dotnet publish Producer/Producer.csproj -c Release -o /app/producer

FROM mcr.microsoft.com/dotnet/runtime:10.0 AS consumer
WORKDIR /app
COPY --from=build /app/consumer .
ENTRYPOINT ["dotnet", "Consumer.dll"]

FROM mcr.microsoft.com/dotnet/runtime:10.0 AS producer
WORKDIR /app
COPY --from=build /app/producer .
ENTRYPOINT ["dotnet", "Producer.dll"]
