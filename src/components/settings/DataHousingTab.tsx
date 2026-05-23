import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database } from "lucide-react";

import { RegionTestingTable } from "./data-housing/RegionTestingTable";
import { EliteAthleteDataTable } from "./data-housing/EliteAthleteDataTable";
import { CsvUploadWizard } from "@/components/programming/csv-upload/CsvUploadWizard";

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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="region-testing">Region Testing</TabsTrigger>
            <TabsTrigger value="elite-athlete-data">Elite Athlete Data</TabsTrigger>
            <TabsTrigger value="csv-imports">CSV Imports</TabsTrigger>
          </TabsList>

          <TabsContent value="region-testing" className="mt-6">
            <RegionTestingTable />
          </TabsContent>

          <TabsContent value="elite-athlete-data" className="mt-6">
            <EliteAthleteDataTable />
          </TabsContent>

          <TabsContent value="csv-imports" className="mt-6">
            <CsvUploadWizard />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
