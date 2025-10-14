import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database } from "lucide-react";

import { RegionTestingTable } from "./data-housing/RegionTestingTable";
import { EliteAthleteDataTable } from "./data-housing/EliteAthleteDataTable";

export const DataHousingTab = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-6 h-6" />
          Data Housing Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="region-testing" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="region-testing">Region Testing</TabsTrigger>
            <TabsTrigger value="elite-athlete-data">Elite Athlete Data</TabsTrigger>
          </TabsList>

          <TabsContent value="region-testing" className="mt-6">
            <RegionTestingTable />
          </TabsContent>

          <TabsContent value="elite-athlete-data" className="mt-6">
            <EliteAthleteDataTable />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};