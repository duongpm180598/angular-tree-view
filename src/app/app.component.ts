import { SelectionModel } from '@angular/cdk/collections';
import { FlatTreeControl, NestedTreeControl } from '@angular/cdk/tree';
import { Component, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MatTreeFlatDataSource,
  MatTreeFlattener,
} from '@angular/material/tree';
import { BehaviorSubject } from 'rxjs';
import { AddCategoryPopupComponent } from './add-category-popup/add-category-popup.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'treeview';
  checkedCategory: any;
  showHidden = false;
  /** Map from flat node to nested node. This helps us finding the nested node to be modified */
  flatNodeMap = new Map<CategoryFlatNode, CategoryItemFlatNode>();

  /** Map from nested node to flattened node. This helps us to keep the same object for selection */
  nestedNodeMap = new Map<CategoryItemFlatNode, CategoryFlatNode>();

  /** A selected parent node to be inserted */
  selectedParent: CategoryFlatNode | null = null;

  /** The new item's name */
  newItemName = '';

  treeControl: FlatTreeControl<CategoryFlatNode>;

  treeFlattener: MatTreeFlattener<CategoryItemFlatNode, CategoryFlatNode>;

  // dataSource: MatTreeFlatDataSource<CategoryItemFlatNode, CategoryFlatNode>;
  dataSource: any;

  /** The selection for checklist */
  categorySelection = new SelectionModel<CategoryFlatNode>(true /* multiple */);

  constructor(
    private database: ChecklistDatabase,
    private dialog: MatDialog,
    private _snackBar: MatSnackBar
  ) {
    this.treeFlattener = new MatTreeFlattener(
      this.transformer,
      this.getLevel,
      this.isExpandable,
      this.getChildren
    );
    this.treeControl = new FlatTreeControl<CategoryFlatNode>(
      this.getLevel,
      this.isExpandable
    );
    this.dataSource = new MatTreeFlatDataSource(
      this.treeControl,
      this.treeFlattener
    );
    database.dataChange.subscribe((data) => {
      this.dataSource.data = data;
    });
  }

  getLevel = (node: CategoryFlatNode) => node.level;

  isExpandable = (node: CategoryFlatNode) => node.expandable;

  getChildren = (node: CategoryItemFlatNode): CategoryItemFlatNode[] =>
    node.children;

  hasChild = (_: number, _nodeData: CategoryFlatNode) => _nodeData.expandable;

  /**
   * Transformer to convert nested node to flat node. Record the nodes in maps for later use.
   */
  transformer = (node: CategoryItemFlatNode, level: number) => {
    const existingNode = this.nestedNodeMap.get(node);
    const flatNode =
      existingNode && existingNode.category_name === node.category_name
        ? existingNode
        : new CategoryFlatNode();
    flatNode.category_id = node.category_id || 213; // || create random
    flatNode.parent_category_id = node.parent_category_id || 0;
    flatNode.isHidden = node.isHidden || false;
    flatNode.category_name = node.category_name;
    flatNode.level = level;
    flatNode.expandable = node?.children?.length > 0;
    this.flatNodeMap.set(flatNode, node);
    this.nestedNodeMap.set(node, flatNode);
    return flatNode;
  };

  /** Whether all the descendants of the node are selected */
  descendantsAllSelected(node: CategoryFlatNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
    return descendants.every((child) =>
      this.categorySelection.isSelected(child)
    );
  }

  /** Whether part of the descendants are selected */
  descendantsPartiallySelected(node: CategoryFlatNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
    const result = descendants.some((child) =>
      this.categorySelection.isSelected(child)
    );
    return result && !this.descendantsAllSelected(node);
  }

  /** Toggle the to-do item selection. Select/deselect all the descendants node */
  categorySelectionToggle(node: CategoryFlatNode): void {
    this.categorySelection.toggle(node);
    const descendants = this.treeControl.getDescendants(node);
    this.categorySelection.isSelected(node)
      ? this.categorySelection.select(...descendants)
      : this.categorySelection.deselect(...descendants);
    this.checkedCategory = this.categorySelection.isSelected(node) ? node : {};
  }

  onToggleNode(node: CategoryFlatNode): void {
    this.categorySelection.toggle(node);
    this.checkedCategory = this.categorySelection.isSelected(node) ? node : {};
  }

  /** Select the category so we can insert the new item. */
  addNewItem(node: CategoryFlatNode) {
    const parentNode = this.flatNodeMap.get(node);
    this.database.insertItem(parentNode!, '');
    this.treeControl.expand(node);
  }

  /** Save the node to database */
  saveNode(node: CategoryFlatNode, itemValue: string) {
    const nestedNode = this.flatNodeMap.get(node);
    this.database.insertItem(nestedNode!, itemValue);
  }

  editNode(node: CategoryFlatNode, itemValue: string) {}

  onAddCategory() {
    const dialogRef = this.dialog.open(AddCategoryPopupComponent, {
      data: { category: this.checkedCategory },
    });
    dialogRef.afterClosed().subscribe((category_name) => {
      if (category_name) {
        const data = [...this.dataSource.data];
        data.push({
          category_id: 4,
          parent_category_id: 0,
          category_name,
          isHidden: false,
          expandable: false,
          children: [],
        });
        this.database.updateTree(data);
      }
    });
  }

  onAddSubCategory(node: CategoryFlatNode) {
    const dialogRef = this.dialog.open(AddCategoryPopupComponent, {
      data: { node },
    });
    dialogRef.afterClosed().subscribe((category_name) => {
      // this.addNewItem(node)
      if (category_name) {
        this.saveNode(node, category_name);
      }
    });
  }

  onHideCategory(node: CategoryFlatNode) {
    const data: any = [];
    this.nestedNodeMap.forEach((nestedNode) => {
      nestedNode.isHidden = this.categorySelection.isSelected(nestedNode);
      data.push({
        category_id: nestedNode.category_id,
        category_name: nestedNode.category_id,
        expandable: nestedNode.expandable,
        isHidden: nestedNode.isHidden,
        level: nestedNode.level,
        parent_category_id: nestedNode.parent_category_id,
      });
    });
    console.log(this.convertListObjectToTreeView(data))
    // const nestHidden = (items: any) =>
    //   items.map((item: CategoryItemFlatNode) => {
    //     return {
    //       ...item,
    //       isHidden: !item.isHidden,
    //       children: nestHidden(item.children),
    //     };
    //   });
    // this.database.updateTree(this.convertListObjectToTreeView(data));
  }

  onEditCategory(node: CategoryFlatNode) {
    const dialogRef = this.dialog.open(AddCategoryPopupComponent, {
      data: { node, type: 'edit' },
    });
    dialogRef.afterClosed().subscribe((category_name) => {
      if (category_name) {
        const updateNested = (items: any) =>
          items.map((item: CategoryItemFlatNode) => {
            if (item.category_id === node.category_id) {
              return {
                ...item,
                category_name,
              };
            }
            if (item.children.length > 0) {
              return {
                ...item,
                children: updateNested(item.children),
              };
            }
            return {
              ...item,
            };
          });
        this.database.updateTree(updateNested(this.dataSource.data));
      }
    });
  }

  onShowHidden(event: any) {
    this.showHidden = event.checked;
    // const nestShowHidden = (items: any) =>
    //   items.map((item: CategoryItemFlatNode) => {
    //     return {
    //       ...item,
    //       expandable: event.checked,
    //       children: nestShowHidden(item.children),
    //     };
    //   });
    // this.database.updateTree(nestShowHidden(this.dataSource.data));
    this.nestedNodeMap.forEach((node) => {
      if (node.isHidden) {
        this.treeControl.expand(node);
      } else {
        this.treeControl.collapse(node);
      }
    });
  }

  flaternCategory(categories: any) {
    let result: any = [];
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      if (c.children) {
        var cc = this.flaternCategory(c.children);
        if (cc) {
          result = result.concat(cc);
        }
      }
      result.push(c);
    }
    return result.map((r: any) => ({
      category_id: r.category_id,
      category_name: r.category_name,
      expandable: r.expandable,
      isHidden: r.isHidden,
      parent_category_id: r.parent_category_id,
    }));
  }

  convertListObjectToTreeView(data: any) {
    const nest = (items: any, category_id = 0, link = 'parent_category_id') =>
      items
        .filter((item: any) => item[link] === category_id)
        .map((item: any) => ({
          ...items,
          children: nest(items, item.category_id),
        }));
    return nest(data);
  }

  flatNode(node: CategoryFlatNode): any {
    return this.flatNodeMap.get(node);
  }
}

/**
 * Node for to-do item
 */
export class CategoryItemFlatNode {
  children!: CategoryItemFlatNode[];
  category_id!: number;
  category_name!: string;
  parent_category_id!: number;
  level!: number;
  expandable!: boolean;
  isHidden!: boolean;
}

/** Flat to-do item node with expandable and level information */
export class CategoryFlatNode {
  category_id!: number;
  category_name!: string;
  parent_category_id!: number;
  level!: number;
  expandable!: boolean;
  isHidden!: boolean;
  children!: [];
}

/**
 * The Json object for to-do list data.
 */
const TREE_DATA = [
  {
    category_id: 1,
    parent_category_id: 0,
    category_name: 'Staffs',
    isHidden: false,
    expandable: false,
    children: [
      {
        category_id: 2,
        parent_category_id: 1,
        category_name: 'Teachers',
        isHidden: false,
        expandable: false,
        children: [],
      },
      {
        category_id: 3,
        parent_category_id: 1,
        category_name: 'Security',
        isHidden: false,
        expandable: false,
        children: [],
      },
    ],
  },
  {
    category_id: 4,
    parent_category_id: 0,
    category_name: 'Manager',
    isHidden: false,
    expandable: false,
    children: [],
  },
];

let TREE_DATA_2: any = [
  {
    category_id: 1,
    parent_category_id: 0,
    category_name: 'Staffs',
    isHidden: false,
  },
  {
    category_id: 2,
    parent_category_id: 1,
    category_name: 'Teachers',
    isHidden: false,
  },
  {
    category_id: 3,
    parent_category_id: 1,
    category_name: 'Security',
    isHidden: false,
  },
];

/**
 * Checklist database, it can build a tree structured Json object.
 * Each node in Json object represents a to-do item or a category.
 * If a node is a category, it has children items and new items can be added under the category.
 */
@Injectable()
export class ChecklistDatabase {
  dataChange = new BehaviorSubject<any[]>([]);

  get data(): CategoryItemFlatNode[] {
    return this.dataChange.value;
  }

  constructor() {
    this.initialize();
  }

  initialize() {
    // Build the tree nodes from Json object. The result is a list of `CategoryItemFlatNode` with nested
    //     file node as children.
    const data = TREE_DATA;

    // Notify the change.
    this.dataChange.next(data);
  }

  /** Add an item to category list */
  insertItem(parent: CategoryItemFlatNode, name: string) {
    if (parent.children) {
      parent.children.push({
        category_id: parent.category_id,
        parent_category_id: parent.parent_category_id,
        category_name: name,
        isHidden: parent.isHidden,
      } as CategoryItemFlatNode);
      this.dataChange.next(this.data);
    }
  }

  updateTree(data: any) {
    this.dataChange.next(data);
  }
}
